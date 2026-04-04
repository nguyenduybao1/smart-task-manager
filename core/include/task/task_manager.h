#pragma once
#include "task.h"
#include <vector>
#include <optional>
#include <functional>

class TaskManager {
public:

    // CRUD 
    TaskId addTask(const Task& task);
    bool removeTask(TaskId id);
    bool updateTask(TaskId id, const Task& updated);
    std::optional<Task> findTask(TaskId id) const;

    // Query
    std::vector<Task> getAllTasks() const;
    std::vector<Task> getTasksByStatus(TaskStatus status) const;
    std::vector<Task> getTasksByPriority(Priority priority) const;
    std::vector<Task> getSubTasks(TaskId parentId) const;

    // Sorting / Filtering 
    std::vector<Task> getSortedByDeadline() const;
    std::vector<Task> getSortedByPriority() const;
    std::vector<Task> filter(std::function<bool(const Task&)> predicate) const;

    // Stats
    size_t taskCount() const;
    bool isEmpty() const;

private:
    std::vector<Task> tasks_;
    TaskId nextId_ = 1;
};