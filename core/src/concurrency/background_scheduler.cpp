#include "concurrency/background_scheduler.h"

BackgroundScheduler::BackgroundScheduler(TaskManager& taskManager, SmartEngine& smartEngine, ThreadPool&  threadPool, std::chrono::milliseconds interval)
    :   taskManager_(taskManager),
        smartEngine_(smartEngine),
        threadPool_(threadPool),
        interval_(interval){}

BackgroundScheduler::~BackgroundScheduler(){
    stop();
}

// ─────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────
 
void BackgroundScheduler::start(){
    if(running_) return; 

    running_ = true;
    schedulerThread_ = std::thread(&BackgroundScheduler::schedulerLoop, this);
}

void BackgroundScheduler::stop(){
    if(!running_) return;

    running_ = false;
    if(schedulerThread_.joinable()){
        schedulerThread_.join();
    }
}

// ─────────────────────────────────────────────
// Scheduler Loop
// ─────────────────────────────────────────────

void BackgroundScheduler::schedulerLoop(){
    while(running_) {
        // Submit cycle into ThreadPool - No block scheduler thread
        auto future = threadPool_.submit([this]{
            executeCycle();
        });

        // Wait cycle complete before sleep
        future.get();
        
        // Sleep with interval, but check running per 100ms
        // Let stop() can exit fast instead of wait out of interval
        auto remaining = interval_;
        constexpr auto kCheckInterval = std::chrono::milliseconds(100);

        while(running_ && remaining > std::chrono::milliseconds(0)){
            auto sleepTime = std::min(remaining, kCheckInterval);
            std::this_thread::sleep_for(sleepTime);
            remaining -= sleepTime;
        }
    }
}

// ─────────────────────────────────────────────
// Execute one cycle
// ─────────────────────────────────────────────

void BackgroundScheduler::executeCycle(){
    auto tasks = taskManager_.getAllTasks();

    // Run SmartEngine to analysis all tasks
    auto assessments = smartEngine_.assessAll(tasks);
    auto metrics = smartEngine_.calcMetrics(tasks);

    cycleCount_.fetch_add(1, std::memory_order_relaxed);

    //Call callback if have register
    std::lock_guard<std::mutex> lock(callbackMutex_);
    if(callback_){
        callback_(assessments, metrics);
    }
}
 
// ─────────────────────────────────────────────
// Manual trigger
// ─────────────────────────────────────────────

void BackgroundScheduler::runOnce(){
    threadPool_.submit([this]{
        executeCycle();
    }).get(); // Block until finish
}

// ─────────────────────────────────────────────
// Register callback
// ─────────────────────────────────────────────

void BackgroundScheduler::onCycleComplete(SchedulerCallback callback){
    std::lock_guard<std::mutex> lock(callbackMutex_);
    callback_ = std::move(callback);
}