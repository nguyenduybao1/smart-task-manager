add_library(core STATIC
    src/task/task_manager.cpp
    src/smart/smart_engine.cpp
    src/concurrency/thread_pool.cpp
    src/concurrency/background_scheduler.cpp
)   

target_include_directories(core PUBLIC include)

target_compile_features(core PUBLIC cxx_std_20)