#include "concurrency/async_persistence.h"
#include <fstream>
#include <sstream>
#include <stdexcept>
#include <chrono>

AsyncPersistence::AsyncPersistence(ThreadPool&        threadPool,
                                   const std::string& filePath)
    : threadPool_(threadPool)
    , filePath_(filePath)
{}

// ─────────────────────────────────────────────
// Async API
// ─────────────────────────────────────────────

std::future<bool> AsyncPersistence::saveAsync(const std::vector<Task>& tasks,
                                               PersistenceCallback      callback) {
    // Copy tasks to preven dangling reference when running in background thread
    auto tasksCopy = tasks;

    return threadPool_.submit([this, tasksCopy, callback]() -> bool {
        bool success = saveSync(tasksCopy);

        if (callback) {
            callback(success, success ? "" : "Failed to write to file: " + filePath_);
        }

        return success;
    });
}

std::future<std::vector<Task>> AsyncPersistence::loadAsync(PersistenceCallback callback) {
    return threadPool_.submit([this, callback]() -> std::vector<Task> {
        try {
            auto tasks = loadSync();

            if (callback) {
                callback(true, "");
            }

            return tasks;
        } catch (const std::exception& e) {
            if (callback) {
                callback(false, e.what());
            }
            return {};
        }
    });
}

// ─────────────────────────────────────────────
// Sync API
// ─────────────────────────────────────────────

bool AsyncPersistence::saveSync(const std::vector<Task>& tasks) {
    try {
        std::ofstream file(filePath_, std::ios::out | std::ios::trunc);
        if (!file.is_open()) return false;

        file << serialize(tasks);
        file.flush();
        return file.good();
    } catch (...) {
        return false;
    }
}

std::vector<Task> AsyncPersistence::loadSync() {
    if (!fileExists()) return {};

    std::ifstream file(filePath_);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot open file: " + filePath_);
    }

    std::stringstream buffer;
    buffer << file.rdbuf();
    return deserialize(buffer.str());
}

// ─────────────────────────────────────────────
// Serialization (lightweight JSON — no deps)
// ─────────────────────────────────────────────

std::string AsyncPersistence::serialize(const std::vector<Task>& tasks) const {
    std::ostringstream oss;
    oss << "[\n";

    for (size_t i = 0; i < tasks.size(); ++i) {
        oss << "  " << taskToJson(tasks[i]);
        if (i + 1 < tasks.size()) oss << ",";
        oss << "\n";
    }

    oss << "]";
    return oss.str();
}

std::vector<Task> AsyncPersistence::deserialize(const std::string& json) const {
    std::vector<Task> tasks;
    if (json.empty() || json == "[]") return tasks;

    // Simple parser: find every object {} in array
    size_t pos = 0;
    while ((pos = json.find('{', pos)) != std::string::npos) {
        size_t end = json.find('}', pos);
        if (end == std::string::npos) break;

        std::string obj = json.substr(pos, end - pos + 1);
        tasks.push_back(taskFromJson(obj));
        pos = end + 1;
    }

    return tasks;
}

// ─────────────────────────────────────────────
// JSON helpers
// ─────────────────────────────────────────────

std::string AsyncPersistence::taskToJson(const Task& task) const {
    std::ostringstream oss;
    oss << "{"
        << "\"id\":"          << task.id                          << ","
        << "\"title\":\""     << task.title                       << "\","
        << "\"description\":\"" << task.description               << "\","
        << "\"status\":"      << static_cast<int>(task.status)    << ","
        << "\"priority\":"    << static_cast<int>(task.priority)  << ","
        << "\"deadline\":\""  << timePointToString(task.deadline) << "\","
        << "\"createdAt\":\"" << timePointToString(task.createdAt)<< "\","
        << "\"parentId\":"    << (task.parentId.has_value()
                                  ? std::to_string(task.parentId.value())
                                  : "null")
        << "}";
    return oss.str();
}

Task AsyncPersistence::taskFromJson(const std::string& json) const {
    Task task;

    // Helper lambda: extract value by key
    auto extract = [&](const std::string& key) -> std::string {
        std::string searchKey = "\"" + key + "\":";
        size_t pos = json.find(searchKey);
        if (pos == std::string::npos) return "";

        pos += searchKey.size();

        // String value
        if (json[pos] == '"') {
            size_t start = pos + 1;
            size_t end   = json.find('"', start);
            return json.substr(start, end - start);
        }

        // Numeric / null value
        size_t end = json.find_first_of(",}", pos);
        return json.substr(pos, end - pos);
    };

    task.id          = static_cast<TaskId>(std::stoul(extract("id")));
    task.title       = extract("title");
    task.description = extract("description");
    task.status      = static_cast<TaskStatus>(std::stoi(extract("status")));
    task.priority    = static_cast<Priority>(std::stoi(extract("priority")));
    task.deadline    = stringToTimePoint(extract("deadline"));
    task.createdAt   = stringToTimePoint(extract("createdAt"));

    std::string parentIdStr = extract("parentId");
    if (parentIdStr != "null" && !parentIdStr.empty()) {
        task.parentId = static_cast<TaskId>(std::stoul(parentIdStr));
    }

    return task;
}

// ─────────────────────────────────────────────
// Time helpers
// ─────────────────────────────────────────────

std::string AsyncPersistence::timePointToString(const TimePoint& tp) const {
    auto epoch = tp.time_since_epoch();
    auto seconds = std::chrono::duration_cast<std::chrono::seconds>(epoch).count();
    return std::to_string(seconds);
}

TimePoint AsyncPersistence::stringToTimePoint(const std::string& str) const {
    if (str.empty()) return TimePoint{};
    long long seconds = std::stoll(str);
    return TimePoint{ std::chrono::seconds(seconds) };
}

// ─────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────

bool AsyncPersistence::fileExists() const {
    return std::filesystem::exists(filePath_);
}

void AsyncPersistence::setFilePath(const std::string& path) {
    filePath_ = path;
}