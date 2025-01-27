package com.appsmith.server.solutions;

import com.appsmith.server.services.FeatureFlagService;
import com.appsmith.server.solutions.ce.ScheduledTaskCEImpl;
import reactor.core.scheduler.Scheduler;

public class ScheduledTaskImpl extends ScheduledTaskCEImpl implements ScheduledTask {
    public ScheduledTaskImpl(FeatureFlagService featureFlagService, Scheduler scheduler) {
        super(featureFlagService, scheduler);
    }
}
