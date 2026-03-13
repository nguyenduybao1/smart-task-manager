#include "task/thread_pool.h"

ThreadPool::ThreadPool(size_t numThreads){
    if(numThreads == 0){
        throw std::invalid_argument("ThreadPool must have at least 1 thread");
    }

    workers_.reserve(numThreads);
    for(size_t i = 0; i < numThreads; ++i){
        workers_.emplace_back(&ThreadPool::workerLoop, this);
    }
}

ThreadPool::~ThreadPool() {
    // Signal all workers to stop 
    running_ = false;
    condition_.notify_all();

    // Join all threads - Ensure no threads are detached
    for(auto& worker : workers_){
        if(worker.joinable()){
            worker.join();
        }
    }
}

void ThreadPool::workerLoop(){
    while(true){
        std::function<void()> task;

        {
            std::unique_lock<std::mutex> lock(queueMutex_);

            // Wait until a task is available or pool is stopped
            condition_.wait(lock, [this] {
                return !taskQueue_.empty() || !running_;
            });

            // If pool is stopped and queue is empty
            if(!running_ && taskQueue_.empty()) return;

            // Dequeue next task (FIFO)
            task = std::move(taskQueue_.front());
            taskQueue_.pop();
        }

        // Execute task outside the lock - To prevent deadlock
        task();
    }
}

size_t ThreadPool::pendingCount() const {
    std::lock_guard<std::mutex> lock(queueMutex_);
    return taskQueue_.size();
}