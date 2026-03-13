#include <gtest/gtest.h>
#include "task/task_manager.h"
#include <chrono>

using namespace std::chrono;

// ─────────────────────────────────────────────
// Helper: Create fast task for test
// ─────────────────────────────────────────────
Task makeTask(const std::string& title,
              TaskStatus status = TaskStatus::Todo,
              Priority priority = Priority::Medium,
              int deadlineOffsetDays = 7) {
    Task t;
    t.id = 0;
    t.title = title;
    t.description = "";
    t.status = status;
    t.priority = priority;
    t.deadline = system_clock::now() + hours(24 * deadlineOffsetDays);
    t.createdAt = system_clock::now();
    return t;
}

// ─────────────────────────────────────────────
// CRUD Tests
// ─────────────────────────────────────────────

TEST(TaskManagerTest, AddTask_ShouldIncreaseCount) {
    TaskManager tm;
    EXPECT_TRUE(tm.isEmpty());

    tm.addTask(makeTask("Task A"));
    EXPECT_EQ(tm.taskCount(), 1);

    tm.addTask(makeTask("Task B"));
    EXPECT_EQ(tm.taskCount(), 2);
}

TEST(TaskManagerTest, AddTask_ShouldAutoAssignId) {
    TaskManager tm;
    TaskId id1 = tm.addTask(makeTask("Task A"));
    TaskId id2 = tm.addTask(makeTask("Task B"));

    EXPECT_NE(id1, id2);
    EXPECT_GT(id1, 0u);
    EXPECT_GT(id2, id1);
}

TEST(TaskManagerTest, FindTask_ShouldReturnCorrectTask) {
    TaskManager tm;
    TaskId id = tm.addTask(makeTask("Find Me"));

    auto result = tm.findTask(id);
    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result->title, "Find Me");
}

TEST(TaskManagerTest, FindTask_NotFound_ShouldReturnNullopt) {
    TaskManager tm;
    auto result = tm.findTask(999);
    EXPECT_FALSE(result.has_value());
}

TEST(TaskManagerTest, RemoveTask_ShouldDecreaseCount) {
    TaskManager tm;
    TaskId id = tm.addTask(makeTask("Remove Me"));
    EXPECT_EQ(tm.taskCount(), 1);

    bool removed = tm.removeTask(id);
    EXPECT_TRUE(removed);
    EXPECT_EQ(tm.taskCount(), 0);
}

TEST(TaskManagerTest, RemoveTask_NotFound_ShouldReturnFalse) {
    TaskManager tm;
    bool removed = tm.removeTask(999);
    EXPECT_FALSE(removed);
}

TEST(TaskManagerTest, UpdateTask_ShouldChangeTitle) {
    TaskManager tm;
    TaskId id = tm.addTask(makeTask("Old Title"));

    Task updated = makeTask("New Title");
    bool success = tm.updateTask(id, updated);

    EXPECT_TRUE(success);
    auto result = tm.findTask(id);
    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result->title, "New Title");
}

TEST(TaskManagerTest, UpdateTask_ShouldPreserveOriginalId) {
    TaskManager tm;
    TaskId id = tm.addTask(makeTask("Task"));

    Task updated = makeTask("Updated");
    updated.id = 9999; 
    tm.updateTask(id, updated);

    auto result = tm.findTask(id);
    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result->id, id); 
}

TEST(TaskManagerTest, UpdateTask_NotFound_ShouldReturnFalse) {
    TaskManager tm;
    bool success = tm.updateTask(999, makeTask("Ghost"));
    EXPECT_FALSE(success);
}

// ─────────────────────────────────────────────
// Edge Cases
// ─────────────────────────────────────────────

TEST(TaskManagerTest, EmptyTaskList_GetAll_ShouldReturnEmpty) {
    TaskManager tm;
    EXPECT_TRUE(tm.getAllTasks().empty());
}

TEST(TaskManagerTest, AddTask_EmptyTitle_ShouldStillAdd) {
    TaskManager tm;
    TaskId id = tm.addTask(makeTask(""));
    auto result = tm.findTask(id);
    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result->title, "");
}

TEST(TaskManagerTest, RemoveThenFind_ShouldReturnNullopt) {
    TaskManager tm;
    TaskId id = tm.addTask(makeTask("Task"));
    tm.removeTask(id);

    auto result = tm.findTask(id);
    EXPECT_FALSE(result.has_value());
}

// ─────────────────────────────────────────────
// Query Tests
// ─────────────────────────────────────────────

TEST(TaskManagerTest, GetTasksByStatus_ShouldFilterCorrectly) {
    TaskManager tm;
    tm.addTask(makeTask("Todo 1", TaskStatus::Todo));
    tm.addTask(makeTask("Todo 2", TaskStatus::Todo));
    tm.addTask(makeTask("Done 1", TaskStatus::Done));

    auto todos = tm.getTasksByStatus(TaskStatus::Todo);
    EXPECT_EQ(todos.size(), 2);

    auto done = tm.getTasksByStatus(TaskStatus::Done);
    EXPECT_EQ(done.size(), 1);
}

TEST(TaskManagerTest, GetTasksByPriority_ShouldFilterCorrectly) {
    TaskManager tm;
    tm.addTask(makeTask("High 1", TaskStatus::Todo, Priority::High));
    tm.addTask(makeTask("Low 1",  TaskStatus::Todo, Priority::Low));
    tm.addTask(makeTask("High 2", TaskStatus::Todo, Priority::High));

    auto highs = tm.getTasksByPriority(Priority::High);
    EXPECT_EQ(highs.size(), 2);
}

TEST(TaskManagerTest, GetSubtasks_ShouldReturnOnlyChildren) {
    TaskManager tm;
    TaskId parentId = tm.addTask(makeTask("Parent"));

    Task child = makeTask("Child");
    child.parentId = parentId;
    tm.addTask(child);
    tm.addTask(makeTask("Unrelated")); 

    auto subtasks = tm.getSubTasks(parentId);
    EXPECT_EQ(subtasks.size(), 1);
    EXPECT_EQ(subtasks[0].title, "Child");
}

// ─────────────────────────────────────────────
// Sorting Tests
// ─────────────────────────────────────────────

TEST(TaskManagerTest, SortByDeadline_ShouldOrderAscending) {
    TaskManager tm;
    tm.addTask(makeTask("Far",   TaskStatus::Todo, Priority::Medium, 10));
    tm.addTask(makeTask("Near",  TaskStatus::Todo, Priority::Medium, 1));
    tm.addTask(makeTask("Mid",   TaskStatus::Todo, Priority::Medium, 5));

    auto sorted = tm.getSortedByDeadline();
    ASSERT_EQ(sorted.size(), 3);
    EXPECT_EQ(sorted[0].title, "Near");
    EXPECT_EQ(sorted[1].title, "Mid");
    EXPECT_EQ(sorted[2].title, "Far");
}

TEST(TaskManagerTest, SortByPriority_ShouldOrderCriticalFirst) {
    TaskManager tm;
    tm.addTask(makeTask("Low",      TaskStatus::Todo, Priority::Low));
    tm.addTask(makeTask("Critical", TaskStatus::Todo, Priority::Critical));
    tm.addTask(makeTask("Medium",   TaskStatus::Todo, Priority::Medium));

    auto sorted = tm.getSortedByPriority();
    ASSERT_EQ(sorted.size(), 3);
    EXPECT_EQ(sorted[0].title, "Critical");
    EXPECT_EQ(sorted[2].title, "Low");
}