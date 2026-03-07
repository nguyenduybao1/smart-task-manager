#pragma once
#include <string>
#include <chrono>
#include <optional>
#include <vector>

using TaskId = uint32_t;
using TimePoint = std::chrono::system_clock::time_point;

enum class TaskStatus {
    Todo,
    InProgress,
    Done
};
enum class Priority {
    Low,
    Medium,
    High,
    Critical
};

struct Task {
    TaskId id;
    std::string title;
    std::string description;
    TaskStatus status;
    Priority priority;
    TimePoint deadline;
    TimePoint createdAt;

    std::optional<TaskId> parentId;
};