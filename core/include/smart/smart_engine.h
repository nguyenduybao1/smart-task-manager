#pragma once
#include "task/task.h"
#include <vector>
#include <chrono>

struct SmartConfig {
    int criticalThresholdHours = 24;  // < 24h -> Critical
    int highThresholdHours = 72;      // < 72h -> High
    int mediumThresholdHours = 168;   // < 168h (7 days) -> Medium
};

enum class RiskLevel {
    Safe,
    Moderate,
    High,
    Overdue,
};

struct RiskAssessment {
    TaskId taskId;
    RiskLevel risk;
    long long hoursRemaining;
};

struct ProductivityMetrics {
    size_t totalTasks;
    size_t doneTasks;
    size_t inProgressTasks;
    size_t todoTasks;
    size_t overdueTasks;
    double completionRate;
};

class SmartEngine {
public:
    explicit SmartEngine(const SmartConfig& config = SmartConfig{});
    Priority inferPriority(const Task& task) const;
    RiskAssessment assessRisk(const Task& task) const;
    std::vector<RiskAssessment> assessAll(const std::vector<Task>& tasks) const;
    std::vector<Task> filterByRisk(const std::vector<Task>& tasks, RiskLevel risk) const;
    ProductivityMetrics calcMetrics(const std::vector<Task>& tasks) const;
private:
    SmartConfig config_;
    long long hoursUntilDeadline(const Task& task) const;
};