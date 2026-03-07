add_library(core STATIC
    src/task_manager.cpp
)

target_include_directories(core PUBLIC include)

target_compile_features(core PUBLIC cxx_std_20)