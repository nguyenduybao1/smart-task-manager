#pragma once
#include "task/task_manager.h"
#include "concurrency/thread_pool.h"
#include <string>
#include <vector>
#include <future>
#include <functional>
#include <filesystem>


// Callback when save/load complete
using PersistenceCallback = std::function<void(bool success, const std::string& error)>;

class AsyncPersistence {
public:
    explicit AsyncPersistence(ThreadPool& threadPool, const std::string& filePath = "tasks.json");

    // Disable copy and move
    AsyncPersistence(const AsyncPersistence&) = delete;
    AsyncPersistence& operator = (const AsyncPersistence&) = delete;

    // Async save - return future, call callback when finish
    std::future<bool> saveAsync(const std::vector<Task>& tasks, PersistenceCallback callback = nullptr);

    // Async load - return future<vector<Task>>
    std::future<std::vector<Task>> loadAsync(PersistenceCallback callback = nullptr);

    // Sync versions - use for testing and graceful shutdown
    bool saveSync(const std::vector<Task>& tasks);
    std::vector<Task> loadSync();
    
    bool fileExists() const;
    void setFilePath(const std::string& path);
    const std::string& filePath() const { return filePath_; }
    
private:
    std::string serialize(const std::vector<Task>& tasks) const;
    std::vector<Task> deserialize(const std::string& json) const;

    // JSON helpers
    std::string taskToJson(const Task& task) const;
    Task taskFromJson(const std::string& json) const;

    // Time helpers
    std::string timePointToString(const TimePoint& tp) const;
    TimePoint stringToTimePoint(const std::string& str) const;

    ThreadPool& threadPool_;
    std::string filePath_;
};