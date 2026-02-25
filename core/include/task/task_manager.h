#pragma once
#include "task.h"
#include <vector>

class TaskManager {
public:
    void addTask(const Task& task);
    void removeTask(TaskId id);
    Task* findTask(TaskId id);

private:
    std::vector<Task> tasks_;
};