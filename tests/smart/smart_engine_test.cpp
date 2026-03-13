#include <gtest/gtest.h>
#include "smart/smart_engine.h"
#include "task/task.h"
#include <chrono>

using namespace std::chrono;

// ─────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────
Task makeSmartTask(TaskId id,
                   const std::string& title,
                   int deadlineOffsetHours,
                   TaskStatus status = TaskStatus::Todo,
                   Priority priority = Priority::Low) {
    Task t;
    t.id = id;
    t.title = title;
    t.status = status;
    t.priority = priority;
    t.deadline = system_clock::now() + hours(deadlineOffsetHours);
    t.createdAt = system_clock::now();
    return t;
}

// ─────────────────────────────────────────────
// Priority Inference Tests
// ─────────────────────────────────────────────

TEST(SmartEngineTest, InferPriority_Overdue_ShouldBeCritical) {
    SmartEngine engine;
    Task t = makeSmartTask(1, "Overdue", -5); // 5 giờ trước
    EXPECT_EQ(engine.inferPriority(t), Priority::Critical);
}

TEST(SmartEngineTest, InferPriority_Under24h_ShouldBeCritical) {
    SmartEngine engine;
    Task t = makeSmartTask(1, "Almost due", 12); // 12 giờ nữa
    EXPECT_EQ(engine.inferPriority(t), Priority::Critical);
}

TEST(SmartEngineTest, InferPriority_Under72h_ShouldBeHigh) {
    SmartEngine engine;
    Task t = makeSmartTask(1, "Soon", 48); // 48 giờ nữa
    EXPECT_EQ(engine.inferPriority(t), Priority::High);
}

TEST(SmartEngineTest, InferPriority_Under168h_ShouldBeMedium) {
    SmartEngine engine;
    Task t = makeSmartTask(1, "This week", 100); // 100 giờ nữa
    EXPECT_EQ(engine.inferPriority(t), Priority::Medium);
}

TEST(SmartEngineTest, InferPriority_FarDeadline_ShouldBeLow) {
    SmartEngine engine;
    Task t = makeSmartTask(1, "No rush", 500); // 500 giờ nữa
    EXPECT_EQ(engine.inferPriority(t), Priority::Low);
}

TEST(SmartEngineTest, InferPriority_DoneTask_ShouldKeepOriginalPriority) {
    SmartEngine engine;
    // Task đã Done dù overdue vẫn giữ priority gốc
    Task t = makeSmartTask(1, "Done", -10, TaskStatus::Done, Priority::Low);
    EXPECT_EQ(engine.inferPriority(t), Priority::Low);
}

TEST(SmartEngineTest, InferPriority_CustomConfig) {
    SmartConfig config;
    config.criticalThresholdHours = 6;  // chỉ critical khi < 6h
    SmartEngine engine(config);

    Task nearTask = makeSmartTask(1, "Near", 10); // 10h nữa
    // Với config mặc định → Critical, với custom config → High
    EXPECT_NE(engine.inferPriority(nearTask), Priority::Critical);
}

// ─────────────────────────────────────────────
// Risk Assessment Tests
// ─────────────────────────────────────────────

TEST(SmartEngineTest, AssessRisk_Overdue_ShouldBeOverdue) {
    SmartEngine engine;
    Task t = makeSmartTask(1, "Late", -1);
    auto result = engine.assessRisk(t);
    EXPECT_EQ(result.risk, RiskLevel::Overdue);
    EXPECT_LT(result.hoursRemaining, 0);
}

TEST(SmartEngineTest, AssessRisk_Under24h_ShouldBeHigh) {
    SmartEngine engine;
    Task t = makeSmartTask(1, "Urgent", 12);
    EXPECT_EQ(engine.assessRisk(t).risk, RiskLevel::High);
}

TEST(SmartEngineTest, AssessRisk_Under72h_ShouldBeModerate) {
    SmartEngine engine;
    Task t = makeSmartTask(1, "Soon", 48);
    EXPECT_EQ(engine.assessRisk(t).risk, RiskLevel::Moderate);
}

TEST(SmartEngineTest, AssessRisk_FarDeadline_ShouldBeSafe) {
    SmartEngine engine;
    Task t = makeSmartTask(1, "Chill", 500);
    EXPECT_EQ(engine.assessRisk(t).risk, RiskLevel::Safe);
}

TEST(SmartEngineTest, AssessRisk_DoneTask_ShouldBeSafe) {
    SmartEngine engine;
    Task t = makeSmartTask(1, "Done", -5, TaskStatus::Done);
    EXPECT_EQ(engine.assessRisk(t).risk, RiskLevel::Safe);
}

TEST(SmartEngineTest, AssessAll_ShouldReturnSameCountAsTasks) {
    SmartEngine engine;
    std::vector<Task> tasks = {
        makeSmartTask(1, "A", 10),
        makeSmartTask(2, "B", 50),
        makeSmartTask(3, "C", 500)
    };
    auto results = engine.assessAll(tasks);
    EXPECT_EQ(results.size(), tasks.size());
}

TEST(SmartEngineTest, FilterByRisk_ShouldReturnOnlyMatchingTasks) {
    SmartEngine engine;
    std::vector<Task> tasks = {
        makeSmartTask(1, "Urgent",  10),   // High risk
        makeSmartTask(2, "Chill",   500),  // Safe
        makeSmartTask(3, "Overdue", -5)    // Overdue
    };

    auto overdue = engine.filterByRisk(tasks, RiskLevel::Overdue);
    EXPECT_EQ(overdue.size(), 1);
    EXPECT_EQ(overdue[0].title, "Overdue");
}

// ─────────────────────────────────────────────
// Productivity Metrics Tests
// ─────────────────────────────────────────────

TEST(SmartEngineTest, CalcMetrics_EmptyList_ShouldNotCrash) {
    SmartEngine engine;
    std::vector<Task> empty;
    auto m = engine.calcMetrics(empty);

    EXPECT_EQ(m.totalTasks, 0);
    EXPECT_EQ(m.completionRate, 0.0);
}

TEST(SmartEngineTest, CalcMetrics_AllDone_ShouldBe100Percent) {
    SmartEngine engine;
    std::vector<Task> tasks = {
        makeSmartTask(1, "A", 100, TaskStatus::Done),
        makeSmartTask(2, "B", 100, TaskStatus::Done),
    };

    auto m = engine.calcMetrics(tasks);
    EXPECT_EQ(m.doneTasks, 2);
    EXPECT_DOUBLE_EQ(m.completionRate, 1.0);
    EXPECT_EQ(m.overdueTasks, 0);
}

TEST(SmartEngineTest, CalcMetrics_OverdueTasks_ShouldCount) {
    SmartEngine engine;
    std::vector<Task> tasks = {
        makeSmartTask(1, "Overdue 1", -10, TaskStatus::Todo),
        makeSmartTask(2, "Overdue 2", -5,  TaskStatus::InProgress),
        makeSmartTask(3, "Done",      -5,  TaskStatus::Done),  // Done không tính overdue
        makeSmartTask(4, "OK",        100, TaskStatus::Todo)
    };

    auto m = engine.calcMetrics(tasks);
    EXPECT_EQ(m.overdueTasks, 2);  // chỉ Todo và InProgress mới tính
    EXPECT_EQ(m.doneTasks, 1);
    EXPECT_DOUBLE_EQ(m.completionRate, 0.25);
}

TEST(SmartEngineTest, CalcMetrics_MixedStatus_ShouldCountCorrectly) {
    SmartEngine engine;
    std::vector<Task> tasks = {
        makeSmartTask(1, "A", 100, TaskStatus::Todo),
        makeSmartTask(2, "B", 100, TaskStatus::InProgress),
        makeSmartTask(3, "C", 100, TaskStatus::Done),
        makeSmartTask(4, "D", 100, TaskStatus::Done),
    };

    auto m = engine.calcMetrics(tasks);
    EXPECT_EQ(m.totalTasks,      4);
    EXPECT_EQ(m.todoTasks,       1);
    EXPECT_EQ(m.inProgressTasks, 1);
    EXPECT_EQ(m.doneTasks,       2);
    EXPECT_DOUBLE_EQ(m.completionRate, 0.5);
}