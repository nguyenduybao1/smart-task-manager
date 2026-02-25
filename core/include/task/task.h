#pragma once
#include <string>
#include <chrono>

using TaskId = int;
using TimePoint = std::chrono::system_clock::time_point;

enum class TaskStatus {
    Todo,
    InProgress,
    Done
};

struct Task {
    TaskId id;
    std::string title;
    TaskStatus status;
    TimePoint deadline;
};