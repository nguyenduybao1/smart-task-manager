#include "task/task_manager.h"
#include <algorithm>
#include <stdexcept>
#include <chrono>

// ─────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────

TaskId TaskManager::addTask(const Task& task){
    Task newTask = task;
    newTask.id = nextId_++;
    newTask.createdAt = std::chrono::system_clock::now();
    tasks_.push_back(newTask);
    return newTask.id;
}

bool TaskManager::removeTask(TaskId id){
    auto it = std::find_if(tasks_.begin(), tasks_.end(),
        [id](const Task& t) { return t.id == id; });

    if(it == tasks_.end()) return false;

    tasks_.erase(it);
    return true;
}

bool TaskManager::updateTask(TaskId id, const Task& updated){
    auto it = std::find_if(tasks_.begin(), tasks_.end(),
        [id](const Task& t) { return t.id == id; });

    if(it == tasks_.end()) return false;

    TaskId originalId = it->id;
    TimePoint originalCreatedAt = it->createdAt;

    *it = updated;
    it->id = originalId;
    it->createdAt = originalCreatedAt;

    return true;
}

std::optional<Task> TaskManager::findTask(TaskId id) const {
    auto it = std::find_if(tasks_.begin(), tasks_.end(),
        [id](const Task& t) { return t.id == id; });

    if(it == tasks_.end()) return std::nullopt;
    return *it;
}

// ─────────────────────────────────────────────
// Query
// ─────────────────────────────────────────────

std::vector<Task> TaskManager::getAllTasks() const{
    return tasks_;
}

std::vector<Task> TaskManager::getTasksByStatus(TaskStatus status) const{
    return filter([status](const Task& t){
       return t.status == status; 
    });
}

std::vector<Task> TaskManager::getTasksByPriority(Priority priority) const{
    return filter([priority](const Task& t){
        return t.priority == priority;
    });
}

std::vector<Task> TaskManager::getSubTasks(TaskId parentId) const{
    return filter([parentId](const Task& t){
        return t.parentId.has_value() && t.parentId.value() == parentId;
    });
}

// ─────────────────────────────────────────────
// Sorting
// ─────────────────────────────────────────────

std::vector<Task> TaskManager::getSortedByDeadline() const{
    auto sorted = tasks_;
    std::sort(sorted.begin(), sorted.end(),
        [](const Task& a, const Task& b) {
            return a.deadline < b.deadline;
        });
    return sorted;
}

std::vector<Task> TaskManager::getSortedByPriority() const{
    auto sorted = tasks_;
    std::sort(sorted.begin(), sorted.end(),
        [](const Task& a, const Task& b) {
            return static_cast<int>(a.priority) > static_cast<int>(b.priority);
        });
    return sorted;
}

// ─────────────────────────────────────────────
// Filter (generic)
// ─────────────────────────────────────────────

std::vector<Task> TaskManager::filter(std::function<bool(const Task&)> predicate) const{
    std::vector<Task> result;
    std::copy_if(tasks_.begin(), tasks_.end(),
        std::back_inserter(result), predicate);
    return result;    
}

// ─────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────

size_t TaskManager::taskCount() const{
    return tasks_.size();
}

bool TaskManager::isEmpty() const{
    return tasks_.empty();
}