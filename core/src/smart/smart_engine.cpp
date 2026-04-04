#include "smart/smart_engine.h"
#include <algorithm>
#include <chrono>

using namespace std::chrono;

SmartEngine::SmartEngine(const SmartConfig& config)
    : config_(config){}

// ─────────────────────────────────────────────
// Internal helper
// ─────────────────────────────────────────────

long long SmartEngine::hoursUntilDeadline(const Task& task) const {
    auto now = system_clock::now();
    auto diff = duration_cast<hours>(task.deadline - now);
    return diff.count();
}

// ─────────────────────────────────────────────
// Priority Inference
// ─────────────────────────────────────────────
Priority SmartEngine::inferPriority(const Task& task) const {
    if(task.status == TaskStatus::Done){
        return task.priority;
    }

    long long hours = hoursUntilDeadline(task);

    if(hours < 0){
        return Priority::Critical;
    }
    else if(hours < config_.criticalThresholdHours){
        return Priority::Critical;
    }
    else if(hours < config_.highThresholdHours){
        return Priority::High;
    }
    else if(hours < config_.mediumThresholdHours){
        return Priority::Medium;
    }
    return Priority::Low;
}

// ─────────────────────────────────────────────
// Risk Assessment
// ─────────────────────────────────────────────

RiskAssessment SmartEngine::assessRisk(const Task& task) const{
    RiskAssessment result;
    result.taskId = task.id;
    result.hoursRemaining = hoursUntilDeadline(task);

    if(task.status == TaskStatus::Done){
        result.risk = RiskLevel::Safe;
        return result;
    }

    if(result.hoursRemaining < 0){
        result.risk = RiskLevel::Overdue;
    }
    else if(result.hoursRemaining < config_.criticalThresholdHours){
        result.risk = RiskLevel::High;
    }
    else if(result.hoursRemaining < config_.highThresholdHours){
        result.risk = RiskLevel::Moderate;
    }
    else{
        result.risk = RiskLevel::Safe;
    }


    return result;
}

std::vector<RiskAssessment> SmartEngine::assessAll(const std::vector<Task>& tasks) const{
    std::vector<RiskAssessment> results;
    results.reserve(tasks.size());
    for(const auto& task : tasks){
        results.push_back(assessRisk(task));
    }
    return results;
}

std::vector<Task> SmartEngine::filterByRisk(const std::vector<Task>& tasks, RiskLevel risk) const{
    std::vector<Task> result;
    for(const auto& task : tasks){
        if(assessRisk(task).risk == risk){
            result.push_back(task);
        }
    }
    return result;
}

// ─────────────────────────────────────────────
// Productivity Metrics
// ─────────────────────────────────────────────

ProductivityMetrics SmartEngine::calcMetrics(const std::vector<Task>& tasks) const {
    ProductivityMetrics m{};
    m.totalTasks = tasks.size();

    if (m.totalTasks == 0) {
        m.completionRate = 0.0;
        return m;
    }

    for (const auto& task : tasks) {
        switch (task.status) {
            case TaskStatus::Done:       m.doneTasks++;       break;
            case TaskStatus::InProgress: m.inProgressTasks++; break;
            case TaskStatus::Todo:       m.todoTasks++;       break;
        }

        if (task.status != TaskStatus::Done && hoursUntilDeadline(task) < 0) {
            m.overdueTasks++;
        }
    }

    m.completionRate = static_cast<double>(m.doneTasks) / static_cast<double>(m.totalTasks);
    return m;
}

