#pragma once
#include "concurrency/thread_pool.h"
#include "smart/smart_engine.h"
#include "task/task_manager.h"
#include <functional>
#include <atomic>
#include <chrono>
#include <thread>
#include <mutex>

// Callback invoked when scheduler completes one cycle
using SchedulerCallback = std::function<void(const std::vector<RiskAssessment>&, const ProductivityMetrics&)>;

class BackgroundScheduler {
public:
    explicit BackgroundScheduler(TaskManager& taskManager,
                                 SmartEngine& smartEngine,
                                 ThreadPool&  threadPool,
                                 std::chrono::milliseconds interval = std::chrono::seconds(30));
    
    ~BackgroundScheduler();

    // Dont let copy or move
    BackgroundScheduler(const BackgroundScheduler&) = delete;
    BackgroundScheduler& operator = (const BackgroundScheduler&) = delete;

    void start();
    void stop();
    bool isRunning() const { return running_; }

    // Register callback - called after every cycle
    void onCycleComplete(SchedulerCallback callback);

    // Trigger manual cycle immediately (without waiting for interval)
    void runOnce();

    std::chrono::milliseconds interval() const { return interval_; }
    uint64_t cycleCount() const { return cycleCount_; }

private:
    void schedulerLoop();
    void executeCycle();

    TaskManager&                taskManager_;
    SmartEngine&                smartEngine_;
    ThreadPool&                 threadPool_;
    std::chrono::milliseconds   interval_;

    std::atomic<bool>           running_{false};
    std::atomic<uint64_t>       cycleCount_{0};

    std::thread                 schedulerThread_;
    std::mutex                  callbackMutex_;
    SchedulerCallback           callback_;
};