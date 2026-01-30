window.fakeExplanation = {
  question: "Why did the API request fail?",
  reason:
    "The API request failed because the database connection pool ran out of available connections due to a slow query holding connections for too long.",
  analogy:
    "It's like a parking lot where one car stays parked too long, so others can't find space.",
  rootCause:
    "Unoptimized query on users table scanning 2.4M records.",
  stats: {}, // Will be populated from fakeSystemLogs
  actions: [
    {
      id: 1,
      title: "Add Index to 'users' table",
      description: "Create a composite index on (status, created_at) to optimize query performance.",
      isRecommended: true,
      difficulty: "Low",
      impact: "High",
      reason: "This directly addresses the root cause (full table scan) and is the least invasive change with highest impact.",
      steps: [
        { step: 1, title: "Migration", desc: "Create migration file for new index", estTime: "10m", icon: "fa-code" },
        { step: 2, title: "Review", desc: "Get DBA approval for index creation", estTime: "30m", icon: "fa-users" },
        { step: 3, title: "Deploy", desc: "Run migration during low-traffic window", estTime: "1h", icon: "fa-rocket" },
        { step: 4, title: "Verify", desc: "Check query execution plan and latency", estTime: "5m", icon: "fa-check-double" }
      ]
    },
    {
      id: 2,
      title: "Increase Connection Pool Size",
      description: "Bump pool size from 20 to 50 to handle concurrent requests.",
      isRecommended: false,
      difficulty: "Low",
      impact: "Medium",
      reason: "Temporary fix. Will likely hit limits again if query isn't optimized."
    },
    {
      id: 3,
      title: "Implement Caching Layer",
      description: "Cache frequent user queries in Redis for 60 seconds.",
      isRecommended: false,
      difficulty: "High",
      impact: "High",
      reason: "Good long-term strategy but introduces complexity and potential staleness."
    }
  ]
};

// Initialize stats from fakeSystemLogs
(function initializeStats() {
  if (window.fakeSystemLogs) {
    Object.keys(window.fakeSystemLogs).forEach(service => {
      const logs = window.fakeSystemLogs[service];
      const errorCount = logs.filter(l => l.level === 'error').length;
      const totalCount = logs.length;

      let status = 'Healthy';
      if (errorCount > 2) {
        status = 'Critical';
      } else if (errorCount > 0) {
        status = 'Degraded';
      }

      window.fakeExplanation.stats[service] = {
        status: status,
        errors: errorCount,
        total: totalCount
      };
    });
  }
})();

window.fakeTimeline = [
  { time: "14:32:01", title: "User request initiated", type: "info" },
  { time: "14:32:02", title: "Database query executed", type: "info" },
  { time: "14:32:08", title: "Query timeout (6s)", type: "warn" },
  { time: "14:32:09", title: "Connection pool exhausted", type: "error" },
  { time: "14:32:10", title: "Request failed", type: "error" }
];

window.fakeSystemLogs = {
  "Database": [
    { "time": "12:00", "timestamp": "12:00", "level": "error", "event": "High latency detected", "cause": "Connection pool exhausted" },
    { "time": "12:01", "timestamp": "12:01", "level": "info", "event": "Read query executed", "cause": "Normal traffic" },
    { "time": "12:02", "timestamp": "12:02", "level": "error", "event": "Query timeout", "cause": "Table lock contention" },
    { "time": "12:03", "timestamp": "12:03", "level": "error", "event": "Deadlock detected", "cause": "Concurrent writes" },
    { "time": "12:04", "timestamp": "12:04", "level": "warn", "event": "Slow index scan", "cause": "Missing index" },
    { "time": "12:05", "timestamp": "12:05", "level": "error", "event": "Connection refused", "cause": "Max connections reached" },
    { "time": "12:06", "timestamp": "12:06", "level": "error", "event": "Write operation failed", "cause": "Disk I/O saturation" },
    { "time": "12:07", "timestamp": "12:07", "level": "info", "event": "Background cleanup started", "cause": "Scheduled job" },
    { "time": "12:08", "timestamp": "12:08", "level": "error", "event": "Replication lag", "cause": "Network congestion" },
    { "time": "12:09", "timestamp": "12:09", "level": "error", "event": "Transaction rollback", "cause": "Lock wait timeout" },
    { "time": "12:10", "timestamp": "12:10", "level": "warn", "event": "Cache miss spike", "cause": "Cold cache" },
    { "time": "12:11", "timestamp": "12:11", "level": "error", "event": "Checkpoint delay", "cause": "High write throughput" },
    { "time": "12:12", "timestamp": "12:12", "level": "error", "event": "Connection dropped", "cause": "Database restart triggered" },
    { "time": "12:13", "timestamp": "12:13", "level": "info", "event": "Connection re-established", "cause": "Automatic recovery" },
    { "time": "12:14", "timestamp": "12:14", "level": "error", "event": "Service unavailable", "cause": "Database overloaded" }
  ],
  "API Gateway": [
    { "time": "12:00", "timestamp": "12:00", "level": "info", "event": "Gateway started", "cause": "Deployment completed" },
    { "time": "12:01", "timestamp": "12:01", "level": "error", "event": "Increased response time", "cause": "Slow database queries" },
    { "time": "12:02", "timestamp": "12:02", "level": "error", "event": "Request timeout", "cause": "Upstream delay" },
    { "time": "12:03", "timestamp": "12:03", "level": "warn", "event": "Latency spike", "cause": "Backend congestion" },
    { "time": "12:04", "timestamp": "12:04", "level": "error", "event": "502 Bad Gateway", "cause": "Database connection failure" },
    { "time": "12:05", "timestamp": "12:05", "level": "error", "event": "Rate limit exceeded", "cause": "Traffic spike" },
    { "time": "12:06", "timestamp": "12:06", "level": "error", "event": "Upstream timeout", "cause": "Payment service unresponsive" },
    { "time": "12:07", "timestamp": "12:07", "level": "info", "event": "Health check executed", "cause": "Monitoring probe" },
    { "time": "12:08", "timestamp": "12:08", "level": "error", "event": "Circuit breaker opened", "cause": "Repeated failures" },
    { "time": "12:09", "timestamp": "12:09", "level": "error", "event": "Request dropped", "cause": "Thread pool exhaustion" },
    { "time": "12:10", "timestamp": "12:10", "level": "warn", "event": "High memory usage", "cause": "Increased load" },
    { "time": "12:11", "timestamp": "12:11", "level": "error", "event": "Routing failure", "cause": "Service registry unavailable" },
    { "time": "12:12", "timestamp": "12:12", "level": "error", "event": "503 Service Unavailable", "cause": "Multiple upstream failures" },
    { "time": "12:13", "timestamp": "12:13", "level": "info", "event": "Partial traffic restored", "cause": "Auto-scaling triggered" },
    { "time": "12:14", "timestamp": "12:14", "level": "error", "event": "Gateway overload", "cause": "Sustained high traffic" }
  ],
  "Auth": [
    { "time": "12:00", "timestamp": "12:00", "level": "error", "event": "Login failure spike", "cause": "Invalid credentials" },
    { "time": "12:01", "timestamp": "12:01", "level": "info", "event": "Token issued", "cause": "Authentication success" },
    { "time": "12:02", "timestamp": "12:02", "level": "error", "event": "Token validation error", "cause": "Expired certificate" },
    { "time": "12:03", "timestamp": "12:03", "level": "warn", "event": "Authentication delay", "cause": "Database latency" },
    { "time": "12:04", "timestamp": "12:04", "level": "error", "event": "Password reset failed", "cause": "SMTP timeout" },
    { "time": "12:05", "timestamp": "12:05", "level": "error", "event": "Session creation failed", "cause": "Cache unavailable" },
    { "time": "12:06", "timestamp": "12:06", "level": "info", "event": "User logout completed", "cause": "User action" },
    { "time": "12:07", "timestamp": "12:07", "level": "error", "event": "OAuth callback error", "cause": "Provider unavailable" },
    { "time": "12:08", "timestamp": "12:08", "level": "error", "event": "Token refresh failed", "cause": "Refresh token expired" },
    { "time": "12:09", "timestamp": "12:09", "level": "warn", "event": "Multiple failed logins", "cause": "Suspicious activity" },
    { "time": "12:10", "timestamp": "12:10", "level": "error", "event": "Account lockout triggered", "cause": "Security policy enforced" },
    { "time": "12:11", "timestamp": "12:11", "level": "error", "event": "JWT signature mismatch", "cause": "Key rotation incomplete" },
    { "time": "12:12", "timestamp": "12:12", "level": "info", "event": "Security audit logged", "cause": "Automated process" },
    { "time": "12:13", "timestamp": "12:13", "level": "error", "event": "Auth service unavailable", "cause": "Service crash" },
    { "time": "12:14", "timestamp": "12:14", "level": "error", "event": "Login API unresponsive", "cause": "High CPU usage" }
  ],
  "Payment": [
    { "time": "12:00", "timestamp": "12:00", "level": "error", "event": "Transaction timeout", "cause": "Gateway unreachable" },
    { "time": "12:01", "timestamp": "12:01", "level": "info", "event": "Payment initiated", "cause": "User checkout" },
    { "time": "12:02", "timestamp": "12:02", "level": "error", "event": "Duplicate transaction detected", "cause": "Retry malfunction" },
    { "time": "12:03", "timestamp": "12:03", "level": "warn", "event": "Slow settlement", "cause": "Batch backlog" },
    { "time": "12:04", "timestamp": "12:04", "level": "error", "event": "Payment processing failed", "cause": "Upstream API latency" },
    { "time": "12:05", "timestamp": "12:05", "level": "error", "event": "Refund processing delay", "cause": "Downstream service slow" },
    { "time": "12:06", "timestamp": "12:06", "level": "info", "event": "Webhook delivered", "cause": "Client acknowledged" },
    { "time": "12:07", "timestamp": "12:07", "level": "error", "event": "Chargeback initiation failed", "cause": "Bank API error" },
    { "time": "12:08", "timestamp": "12:08", "level": "error", "event": "Payment status unknown", "cause": "Network partition" },
    { "time": "12:09", "timestamp": "12:09", "level": "warn", "event": "Retry queue growing", "cause": "Repeated failures" },
    { "time": "12:10", "timestamp": "12:10", "level": "error", "event": "Currency conversion failed", "cause": "FX service unavailable" },
    { "time": "12:11", "timestamp": "12:11", "level": "error", "event": "Transaction reconciliation error", "cause": "Data mismatch" },
    { "time": "12:12", "timestamp": "12:12", "level": "info", "event": "Partial recovery observed", "cause": "Fallback enabled" },
    { "time": "12:13", "timestamp": "12:13", "level": "error", "event": "Payment service degraded", "cause": "High error rate" },
    { "time": "12:14", "timestamp": "12:14", "level": "error", "event": "Payment service unavailable", "cause": "Service outage" }
  ],
  "Cards": [
    { "time": "12:00", "timestamp": "12:00", "level": "info", "event": "Card service idle", "cause": null }
  ],
  "Notifications": [
    { "time": "12:00", "timestamp": "12:00", "level": "info", "event": "Notification service started", "cause": "Scheduled startup" },
    { "time": "12:01", "timestamp": "12:01", "level": "info", "event": "Email sent successfully", "cause": "User registration" },
    { "time": "12:02", "timestamp": "12:02", "level": "warn", "event": "SMS delivery delayed", "cause": "Provider lag" },
    { "time": "12:03", "timestamp": "12:03", "level": "info", "event": "Push notification delivered", "cause": "Order update" },
    { "time": "12:04", "timestamp": "12:04", "level": "error", "event": "Email delivery failed", "cause": "SMTP connection timeout" },
    { "time": "12:05", "timestamp": "12:05", "level": "warn", "event": "Queue backup detected", "cause": "High volume" }
  ],
  "Analytics": [
    { "time": "12:00", "timestamp": "12:00", "level": "info", "event": "Analytics engine running", "cause": "Normal operation" },
    { "time": "12:01", "timestamp": "12:01", "level": "info", "event": "Event processed", "cause": "User activity" },
    { "time": "12:02", "timestamp": "12:02", "level": "warn", "event": "Processing lag detected", "cause": "Data spike" },
    { "time": "12:03", "timestamp": "12:03", "level": "error", "event": "Data pipeline stalled", "cause": "Database connection issue" },
    { "time": "12:04", "timestamp": "12:04", "level": "info", "event": "Report generated", "cause": "Scheduled task" }
  ],
  "Storage": [
    { "time": "12:00", "timestamp": "12:00", "level": "info", "event": "Storage service healthy", "cause": "Health check" },
    { "time": "12:01", "timestamp": "12:01", "level": "info", "event": "File uploaded", "cause": "User upload" },
    { "time": "12:02", "timestamp": "12:02", "level": "warn", "event": "Disk usage at 75%", "cause": "Growing data" },
    { "time": "12:03", "timestamp": "12:03", "level": "error", "event": "Upload failed", "cause": "S3 timeout" },
    { "time": "12:04", "timestamp": "12:04", "level": "info", "event": "Cleanup completed", "cause": "Automated maintenance" }
  ]
};

window.timelineReplayData = [
  { time: "12:00", service: "Database", level: "info", message: "Health check OK", cause: null },
  { time: "12:00", service: "API Gateway", level: "info", message: "Traffic normal: 200 rps", cause: null },
  { time: "12:00", service: "Storage", level: "info", message: "Storage service healthy", cause: "Health check" },
  { time: "12:00", service: "Notifications", level: "info", message: "Notification service started", cause: "Scheduled startup" },

  { time: "12:01", service: "Auth", level: "info", message: "Token validation successful", cause: null },
  { time: "12:01", service: "Payment", level: "info", message: "Gateway connected", cause: null },
  { time: "12:01", service: "Analytics", level: "info", message: "Event processing normal", cause: "User activity" },
  { time: "12:01", service: "Notifications", level: "info", message: "Email sent successfully", cause: "User registration" },

  // ROOT CAUSE START
  { time: "12:02", service: "Database", level: "error", message: "Connection pool exhausted (50/50)", cause: "Slow query on 'orders' table detected" },
  { time: "12:02", service: "Storage", level: "warn", message: "Disk usage at 75%", cause: "Growing data" },
  { time: "12:02", service: "Notifications", level: "warn", message: "SMS delivery delayed", cause: "Provider lag" },
  { time: "12:02", service: "Analytics", level: "warn", message: "Processing lag detected", cause: "Data spike" },

  { time: "12:03", service: "Database", level: "error", message: "New connections rejected", cause: "Pool saturation" },
  { time: "12:03", service: "API Gateway", level: "warn", message: "Upstream latency spike: Database", cause: "Dependency slow" },
  { time: "12:03", service: "Analytics", level: "error", message: "Data pipeline stalled", cause: "Database connection issue" },
  { time: "12:03", service: "Storage", level: "error", message: "Upload failed", cause: "S3 timeout" },

  { time: "12:04", service: "API Gateway", level: "error", message: "Request timeout (30s)", cause: "Database unresponsive" },
  { time: "12:04", service: "Auth", level: "warn", message: "Token verification delayed", cause: "Database slow" },
  { time: "12:04", service: "Notifications", level: "error", message: "Email delivery failed", cause: "SMTP connection timeout" },

  { time: "12:05", service: "Payment", level: "error", message: "Transaction commit failed", cause: "Database timeout" },
  { time: "12:05", service: "Database", level: "error", message: "IOPS limit reached", cause: "Full table scan aggregation" },
  { time: "12:05", service: "Notifications", level: "warn", message: "Queue backup detected", cause: "High volume" },

  { time: "12:06", service: "Cards", level: "warn", message: "Authorization queue backing up", cause: "Payment service slow" },
  { time: "12:07", service: "Payment", level: "error", message: "Circuit breaker opened: Database", cause: "Consecutive failures" },

  { time: "12:08", service: "Cards", level: "error", message: "Payment authorization failed", cause: "Payment Service Unavailable" },
  { time: "12:09", service: "API Gateway", level: "error", message: "502 Bad Gateway (Global)", cause: "Cascading failure" },

  // RECOVERY START
  { time: "12:10", service: "Database", level: "info", message: "Slow query process terminated (PID 4492)", cause: "Auto-remediation" },
  { time: "12:11", service: "Database", level: "info", message: "Connection pool recovering... (20/50)", cause: "Recovery" },

  { time: "12:12", service: "Payment", level: "info", message: "Circuit breaker half-open", cause: "Recovery" },
  { time: "12:12", service: "Analytics", level: "info", message: "Pipeline restarted", cause: "Recovery" },

  { time: "12:13", service: "Cards", level: "info", message: "Queue processing resumed", cause: "Recovery" },
  { time: "12:13", service: "Notifications", level: "info", message: "Deliveries catching up", cause: "Recovery" },

  { time: "12:14", service: "Auth", level: "info", message: "Latency normalized", cause: "Recovery" },
  { time: "12:14", service: "Storage", level: "info", message: "Upload service restored", cause: "Recovery" },

  { time: "12:15", service: "API Gateway", level: "info", message: "Traffic varying normal", cause: "Recovery" },
  { time: "12:16", service: "Database", level: "info", message: "Health check OK", cause: "Fully Recovered" }
];
