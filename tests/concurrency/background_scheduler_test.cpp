#include <gtest/gtest.h>
#include "concurrency/background_scheduler.h"
#include "task/task_manager.h"
#include "smart/smart_engine.h"
#include "concurrency/thread_pool.h"
#include <atomic>
#include <chrono>

using namespace std::chrono_literals;

// ─────────────────────────────────────────────
// Helper: tạo fixture dùng chung
// ─────────────────────────────────────────────
struct SchedulerFixture {
    TaskManager  taskManager;
    SmartEngine  smartEngine;
    ThreadPool   threadPool{ 4 };

    // Interval ngắn để test nhanh
    BackgroundScheduler scheduler{
        taskManager, smartEngine, threadPool, 200ms
    };

    void addTask(const std::string& title, int deadlineOffsetHours = 100) {
        Task t;
        t.title    = title;
        t.status   = TaskStatus::Todo;
        t.priority = Priority::Medium;
        t.deadline = std::chrono::system_clock::now()
                   + std::chrono::hours(deadlineOffsetHours);
        t.createdAt = std::chrono::system_clock::now();
        taskManager.addTask(t);
    }
};

// ─────────────────────────────────────────────
// Lifecycle Tests
// ─────────────────────────────────────────────

TEST(BackgroundSchedulerTest, InitialState_ShouldNotBeRunning) {
    SchedulerFixture f;
    EXPECT_FALSE(f.scheduler.isRunning());
}

TEST(BackgroundSchedulerTest, Start_ShouldSetRunningTrue) {
    SchedulerFixture f;
    f.scheduler.start();
    EXPECT_TRUE(f.scheduler.isRunning());
    f.scheduler.stop();
}

TEST(BackgroundSchedulerTest, Stop_ShouldSetRunningFalse) {
    SchedulerFixture f;
    f.scheduler.start();
    f.scheduler.stop();
    EXPECT_FALSE(f.scheduler.isRunning());
}

TEST(BackgroundSchedulerTest, Start_CalledTwice_ShouldNotCrash) {
    SchedulerFixture f;
    f.scheduler.start();
    f.scheduler.start(); // gọi lần 2 — phải ignore
    EXPECT_TRUE(f.scheduler.isRunning());
    f.scheduler.stop();
}

TEST(BackgroundSchedulerTest, Stop_CalledTwice_ShouldNotCrash) {
    SchedulerFixture f;
    f.scheduler.start();
    f.scheduler.stop();
    f.scheduler.stop(); // gọi lần 2 — phải ignore
    EXPECT_FALSE(f.scheduler.isRunning());
}

TEST(BackgroundSchedulerTest, Destructor_ShouldStopGracefully) {
    // Destructor phải stop scheduler mà không crash
    {
        TaskManager  tm;
        SmartEngine  se;
        ThreadPool   tp{ 2 };
        BackgroundScheduler sched{ tm, se, tp, 100ms };
        sched.start();
        // Destructor chạy ở đây
    }
    SUCCEED();
}

// ─────────────────────────────────────────────
// RunOnce Tests
// ─────────────────────────────────────────────

TEST(BackgroundSchedulerTest, RunOnce_ShouldIncrementCycleCount) {
    SchedulerFixture f;
    f.addTask("Task A");

    EXPECT_EQ(f.scheduler.cycleCount(), 0);
    f.scheduler.runOnce();
    EXPECT_EQ(f.scheduler.cycleCount(), 1);
}

TEST(BackgroundSchedulerTest, RunOnce_EmptyTaskList_ShouldNotCrash) {
    SchedulerFixture f;
    // Không có task nào — vẫn phải chạy được
    EXPECT_NO_THROW(f.scheduler.runOnce());
}

TEST(BackgroundSchedulerTest, RunOnce_MultipleTimes_ShouldAccumulateCycles) {
    SchedulerFixture f;
    f.addTask("Task A");

    f.scheduler.runOnce();
    f.scheduler.runOnce();
    f.scheduler.runOnce();

    EXPECT_EQ(f.scheduler.cycleCount(), 3);
}

// ─────────────────────────────────────────────
// Callback Tests
// ─────────────────────────────────────────────

TEST(BackgroundSchedulerTest, Callback_ShouldBeCalledAfterRunOnce) {
    SchedulerFixture f;
    f.addTask("Task A");
    f.addTask("Task B");

    std::atomic<bool> callbackCalled{ false };
    size_t receivedTotal = 0;

    f.scheduler.onCycleComplete([&](const std::vector<RiskAssessment>& assessments,
                                    const ProductivityMetrics& metrics) {
        callbackCalled = true;
        receivedTotal  = metrics.totalTasks;
    });

    f.scheduler.runOnce();

    EXPECT_TRUE(callbackCalled.load());
    EXPECT_EQ(receivedTotal, 2);
}

TEST(BackgroundSchedulerTest, Callback_ShouldReceiveCorrectAssessments) {
    SchedulerFixture f;
    f.addTask("Safe task",   500);   // Safe
    f.addTask("Urgent task", 10);    // High risk

    std::vector<RiskAssessment> received;

    f.scheduler.onCycleComplete([&](const std::vector<RiskAssessment>& assessments,
                                    const ProductivityMetrics&) {
        received = assessments;
    });

    f.scheduler.runOnce();

    EXPECT_EQ(received.size(), 2);
}

// ─────────────────────────────────────────────
// Auto Cycle Tests
// ─────────────────────────────────────────────

TEST(BackgroundSchedulerTest, AutoCycle_ShouldRunMultipleTimes) {
    SchedulerFixture f;
    f.addTask("Task A");

    f.scheduler.start();

    // Chờ đủ để scheduler chạy ít nhất 2 cycles (interval = 200ms)
    std::this_thread::sleep_for(500ms);
    f.scheduler.stop();

    EXPECT_GE(f.scheduler.cycleCount(), 2);
}

TEST(BackgroundSchedulerTest, AutoCycle_CallbackCalledMultipleTimes) {
    SchedulerFixture f;
    f.addTask("Task A");

    std::atomic<int> callCount{ 0 };
    f.scheduler.onCycleComplete([&](const std::vector<RiskAssessment>&,
                                     const ProductivityMetrics&) {
        callCount.fetch_add(1, std::memory_order_relaxed);
    });

    f.scheduler.start();
    std::this_thread::sleep_for(500ms);
    f.scheduler.stop();

    EXPECT_GE(callCount.load(), 2);
}