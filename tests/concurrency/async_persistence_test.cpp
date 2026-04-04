#include <gtest/gtest.h>
#include "concurrency/async_persistence.h"
#include "concurrency/thread_pool.h"
#include <filesystem>
#include <chrono>

using namespace std::chrono_literals;

// ─────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────
const std::string TEST_FILE = "test_tasks.json";

Task makePersistedTask(TaskId id, const std::string& title,
                       TaskStatus status   = TaskStatus::Todo,
                       Priority   priority = Priority::Medium) {
    Task t;
    t.id          = id;
    t.title       = title;
    t.description = "desc_" + title;
    t.status      = status;
    t.priority    = priority;
    t.deadline    = std::chrono::system_clock::now() + std::chrono::hours(48);
    t.createdAt   = std::chrono::system_clock::now();
    return t;
}

// Cleanup file sau mỗi test
class AsyncPersistenceTest : public ::testing::Test {
protected:
    void TearDown() override {
        if (std::filesystem::exists(TEST_FILE)) {
            std::filesystem::remove(TEST_FILE);
        }
    }

    ThreadPool       pool{ 4 };
    AsyncPersistence persistence{ pool, TEST_FILE };
};

// ─────────────────────────────────────────────
// Sync Tests
// ─────────────────────────────────────────────

TEST_F(AsyncPersistenceTest, SaveSync_ShouldCreateFile) {
    std::vector<Task> tasks = { makePersistedTask(1, "Task A") };
    bool success = persistence.saveSync(tasks);

    EXPECT_TRUE(success);
    EXPECT_TRUE(persistence.fileExists());
}

TEST_F(AsyncPersistenceTest, LoadSync_NoFile_ShouldReturnEmpty) {
    auto tasks = persistence.loadSync();
    EXPECT_TRUE(tasks.empty());
}

TEST_F(AsyncPersistenceTest, SaveAndLoad_ShouldPreserveTaskCount) {
    std::vector<Task> original = {
        makePersistedTask(1, "Task A"),
        makePersistedTask(2, "Task B"),
        makePersistedTask(3, "Task C"),
    };

    persistence.saveSync(original);
    auto loaded = persistence.loadSync();

    EXPECT_EQ(loaded.size(), original.size());
}

TEST_F(AsyncPersistenceTest, SaveAndLoad_ShouldPreserveFields) {
    Task original = makePersistedTask(1, "Important Task",
                                      TaskStatus::InProgress,
                                      Priority::High);
    persistence.saveSync({ original });
    auto loaded = persistence.loadSync();

    ASSERT_EQ(loaded.size(), 1);
    EXPECT_EQ(loaded[0].id,       original.id);
    EXPECT_EQ(loaded[0].title,    original.title);
    EXPECT_EQ(loaded[0].status,   original.status);
    EXPECT_EQ(loaded[0].priority, original.priority);
}

TEST_F(AsyncPersistenceTest, SaveAndLoad_WithParentId_ShouldPreserve) {
    Task parent = makePersistedTask(1, "Parent");
    Task child  = makePersistedTask(2, "Child");
    child.parentId = 1;

    persistence.saveSync({ parent, child });
    auto loaded = persistence.loadSync();

    ASSERT_EQ(loaded.size(), 2);
    EXPECT_FALSE(loaded[0].parentId.has_value());
    ASSERT_TRUE(loaded[1].parentId.has_value());
    EXPECT_EQ(loaded[1].parentId.value(), 1u);
}

TEST_F(AsyncPersistenceTest, SaveSync_EmptyList_ShouldSaveAndLoadEmpty) {
    persistence.saveSync({});
    auto loaded = persistence.loadSync();
    EXPECT_TRUE(loaded.empty());
}

TEST_F(AsyncPersistenceTest, SaveSync_Overwrite_ShouldReplaceContent) {
    persistence.saveSync({ makePersistedTask(1, "Old") });
    persistence.saveSync({ makePersistedTask(2, "New A"),
                           makePersistedTask(3, "New B") });

    auto loaded = persistence.loadSync();
    EXPECT_EQ(loaded.size(), 2);
    EXPECT_EQ(loaded[0].title, "New A");
}

// ─────────────────────────────────────────────
// Async Tests
// ─────────────────────────────────────────────

TEST_F(AsyncPersistenceTest, SaveAsync_ShouldReturnTrue) {
    std::vector<Task> tasks = { makePersistedTask(1, "Async Task") };
    auto future = persistence.saveAsync(tasks);
    EXPECT_TRUE(future.get());
}

TEST_F(AsyncPersistenceTest, LoadAsync_ShouldReturnCorrectTasks) {
    std::vector<Task> tasks = {
        makePersistedTask(1, "Async A"),
        makePersistedTask(2, "Async B"),
    };

    persistence.saveSync(tasks);

    auto future = persistence.loadAsync();
    auto loaded = future.get();

    EXPECT_EQ(loaded.size(), 2);
}

TEST_F(AsyncPersistenceTest, SaveAsync_Callback_ShouldBeCalled) {
    std::atomic<bool> callbackCalled{ false };
    std::atomic<bool> callbackSuccess{ false };

    std::vector<Task> tasks = { makePersistedTask(1, "Callback Task") };

    auto future = persistence.saveAsync(tasks, [&](bool success, const std::string&) {
        callbackCalled  = true;
        callbackSuccess = success;
    });

    future.get();

    EXPECT_TRUE(callbackCalled.load());
    EXPECT_TRUE(callbackSuccess.load());
}

TEST_F(AsyncPersistenceTest, LoadAsync_EmptyFile_ShouldReturnEmpty) {
    auto future = persistence.loadAsync();
    auto loaded = future.get();
    EXPECT_TRUE(loaded.empty());
}

TEST_F(AsyncPersistenceTest, SaveAsync_ThenLoadAsync_ShouldBeConsistent) {
    std::vector<Task> original = {
        makePersistedTask(1, "Consistent A", TaskStatus::Done,     Priority::High),
        makePersistedTask(2, "Consistent B", TaskStatus::InProgress, Priority::Critical),
    };

    persistence.saveAsync(original).get();

    auto loaded = persistence.loadAsync().get();
    ASSERT_EQ(loaded.size(), 2);
    EXPECT_EQ(loaded[0].status,   TaskStatus::Done);
    EXPECT_EQ(loaded[1].priority, Priority::Critical);
}