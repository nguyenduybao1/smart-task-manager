#pragma once
#include <vector>
#include <queue>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <functional>
#include <future>
#include <atomic>
#include <stdexcept>
class ThreadPool {
public:
    explicit ThreadPool(size_t numThreads);
    ~ThreadPool();
    
    // Not let copy or move - resource ownership clarify
    ThreadPool(const ThreadPool&) = delete;
    ThreadPool& operator = (const ThreadPool&) = delete;

    //Submit task, return future to caller can wait for the result
    template<typename F, typename... Args> 
    auto submit(F&& f, Args&&...args) -> std::future<std::invoke_result_t<F, Args...>>;
    
    size_t threadCount() const {return workers_.size();}
    size_t pendingCount() const;
    bool   isRunning() const {return running_; }

private:
    void workerLoop();

    std::vector<std::thread>           workers_;
    std::queue<std::function<void()>>  taskQueue_;
    mutable std::mutex                 queueMutex_;
    std::condition_variable            condition_;
    std::atomic<bool>                  running_{ true };

};

// ─────────────────────────────────────────────
// Template implementation
// ─────────────────────────────────────────────

template<typename F, typename... Args>
auto ThreadPool::submit(F&& f, Args&&... args) -> std::future<std::invoke_result_t<F, Args...>>{
    using ReturnType = std::invoke_result_t<F, Args...>;

    if(!running_){
        throw std::runtime_error("ThreadPool is stopped - can not submit new tasks");
    }

    //Wrap task into packaged_task to get future
    auto task = std::make_shared<std::packaged_task<ReturnType()>>(
        std::bind(std::forward<F>(f), std::forward<Args>(args)...)
    );

    std::future<ReturnType> result = task->get_future();

    {
        std::lock_guard<std::mutex> lock(queueMutex_);
        taskQueue_.emplace([task]() {( *task )(); });
    }

    condition_.notify_one();
    return result;
}  