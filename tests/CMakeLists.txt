include(FetchContent)

FetchContent_Declare(
    googletest
    URL https://github.com/google/googletest/archive/refs/tags/v1.14.0.zip
)

# Tránh override compiler/linker settings trên Windows
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

enable_testing()

add_executable(task_manager_test
    task/task_manager_test.cpp
)

target_link_libraries(task_manager_test
    PRIVATE
    core
    GTest::gtest_main
)

add_executable(smart_engine_test
    smart/smart_engine_test.cpp
)

target_link_libraries(smart_engine_test
    PRIVATE core GTest::gtest_main
)

add_executable(thread_pool_test
    concurrency/thread_pool_test.cpp
)

target_link_libraries(thread_pool_test
    PRIVATE core GTest::gtest_main
)

add_executable(background_scheduler_test
    concurrency/background_scheduler_test.cpp
)

target_link_libraries(background_scheduler_test
    PRIVATE core GTest::gtest_main
)

add_executable(async_persistence_test
    concurrency/async_persistence_test.cpp
)

target_link_libraries(async_persistence_test
    PRIVATE core GTest::gtest_main
)

include(GoogleTest)
gtest_discover_tests(task_manager_test)
gtest_discover_tests(smart_engine_test)
gtest_discover_tests(thread_pool_test)
gtest_discover_tests(background_scheduler_test)
gtest_discover_tests(async_persistence_test)