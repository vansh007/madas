/* Pre-recorded diagnosis from a real MADAS run (captured on a local Ollama model).
   Used by the "Try it once" demo so visitors can see the full flow with no backend
   and no LLM — a faithful glimpse of what the system produces once it's set up. */

export const DEMO_INPUT = `ERROR 2024-03-15 14:23:01 [api-gateway] POST /api/v2/orders → 500
Traceback:
  File "app/routes/orders.py", line 142, in create_order
    result = await order_service.process(order_data)
  File "app/clients/inventory.py", line 34, in reserve
    response = await self.http.post("/reserve", json=payload, timeout=5.0)
httpx.ReadTimeout: timed out

Metrics (last 5 min):
  inventory-service response: p50=1.2s, p95=4.8s, p99=12.3s
  Connection pool: 48/50 active
  Upstream CPU: 94%, Memory: 87%`

export const DEMO_EVENTS = [
  { agent: 'memory', action: 'rag_retrieval', detail: 'Found 3 similar past incidents' },
  { agent: 'investigator', action: 'analyze', detail: 'Generated 3 hypotheses' },
  { agent: 'engineer', action: 'propose_fixes', detail: 'Proposed 3 fixes' },
  { agent: 'arbiter', action: 'evaluate_round_1', detail: 'Verdict: H1 (confidence: 80%)' },
  { agent: 'system', action: 'finalize', detail: 'Diagnosis converged — 80% confidence' },
  { agent: 'reporter', action: 'generate_report', detail: 'Report ready — severity SEV3: Inventory Service Resource Saturation' },
]

export const DEMO_RESULT = {
  verdict: {
    winning_hypothesis: 'H1',
    overall_confidence: 0.8,
    reasoning: 'H1 has strong evidence and a comprehensive fix, making it the most likely root cause of the problem. While H2 and H3 have low risk and are easy to implement, they may not address the actual issue.',
    dissent: 'There is some uncertainty as H2 and H3 could potentially be valid issues that should also be investigated further.',
  },
  winning_hypothesis: {
    id: 'H1',
    title: 'Resource Saturation of Inventory Service',
    description: 'The high CPU utilization and long p99 latency suggest that the inventory service is under heavy load, leading to read timeouts when processing order requests. This could be due to insufficient scaling or resource mismanagement.',
    evidence: ['httpx.ReadTimeout: timed out', 'Connection pool: 48/50 active', 'Upstream CPU: 94%, Memory: 87%'],
    confidence: 0.9,
    category: 'concurrency',
  },
  winning_fix: {
    hypothesis_id: 'H1',
    fix_title: 'Increase Inventory Service Scaling',
    description: 'Scale up the inventory service to handle increased load and reduce CPU utilization.',
    code_snippet: 'kubectl scale deployment/inventory-service --replicas=5\n# or if using AWS ECS\naws ecs update-service --service inventory-service --desired-count 5',
    risk_level: 'medium',
    effort: 'hours',
    side_effects: ['Increased cost due to additional instances, potential impact on other services'],
  },
  all_hypotheses: [
    {
      id: 'H1',
      title: 'Resource Saturation of Inventory Service',
      description: 'The high CPU utilization and long p99 latency suggest that the inventory service is under heavy load, leading to read timeouts when processing order requests.',
      evidence: ['httpx.ReadTimeout: timed out', 'Connection pool: 48/50 active', 'Upstream CPU: 94%, Memory: 87%'],
      confidence: 0.9,
      category: 'concurrency',
    },
    {
      id: 'H2',
      title: 'Timeout Configuration Too Low for Current Load',
      description: 'The current timeout configuration of 5 seconds might be too low given the high p99 latency (12.3s). This could lead to read timeouts even if the service is not fully saturated.',
      evidence: ['httpx.ReadTimeout: timed out', 'p99=12.3s'],
      confidence: 0.7,
      category: 'configuration',
    },
    {
      id: 'H3',
      title: 'Connection Pool Exhaustion in Inventory Service',
      description: 'The connection pool is active at 48/50, which could indicate that the inventory service is experiencing connection exhaustion. This might be due to a resource leak or insufficient pool size.',
      evidence: ['httpx.ReadTimeout: timed out', 'Connection pool: 48/50 active'],
      confidence: 0.6,
      category: 'dependency',
    },
  ],
  all_fixes: [
    {
      hypothesis_id: 'H1',
      fix_title: 'Increase Inventory Service Scaling',
      description: 'Scale up the inventory service to handle increased load and reduce CPU utilization.',
      code_snippet: 'kubectl scale deployment/inventory-service --replicas=5',
      risk_level: 'medium',
      effort: 'hours',
      side_effects: ['Increased cost due to additional instances'],
    },
    {
      hypothesis_id: 'H2',
      fix_title: 'Increase Timeout Configuration',
      description: 'Extend the timeout configuration for the API requests to better handle current load conditions.',
      code_snippet: 'api_client.timeout = 15\n# or via env\nexport API_CLIENT_TIMEOUT=15',
      risk_level: 'low',
      effort: 'minutes',
      side_effects: ['Potential increase in memory usage during request processing'],
    },
    {
      hypothesis_id: 'H3',
      fix_title: 'Increase Connection Pool Size',
      description: 'Increase the connection pool size to prevent exhaustion and ensure sufficient connections are available.',
      code_snippet: 'inventory_service.config.connection_pool_size = 75',
      risk_level: 'low',
      effort: 'minutes',
      side_effects: ['Increased memory usage for additional connections'],
    },
  ],
  evaluations: [
    {
      hypothesis_id: 'H1',
      evidence_score: 0.9,
      fix_completeness: 0.85,
      risk_score: 0.7,
      critique: 'The evidence strongly supports the hypothesis, but the fix is a scaling change which might not address immediate issues if the timeout configuration is indeed too low.',
      suggestion: 'Consider checking both timeout and scaling configurations to ensure comprehensive resolution.',
    },
    {
      hypothesis_id: 'H2',
      evidence_score: 0.7,
      fix_completeness: 1.0,
      risk_score: 0.5,
      critique: 'The evidence is somewhat weak as it does not directly link the timeout to the current load conditions, but the fix is straightforward and low-risk.',
      suggestion: 'Verify that increasing the timeout will resolve the issue before implementing.',
    },
    {
      hypothesis_id: 'H3',
      evidence_score: 0.6,
      fix_completeness: 1.0,
      risk_score: 0.5,
      critique: 'The evidence is weak as connection pool exhaustion might not be the root cause, and increasing the pool size could introduce other issues.',
      suggestion: 'Investigate further to confirm that connection pool exhaustion is indeed the issue before implementing this fix.',
    },
  ],
  investigation_summary: 'The API endpoint /api/v2/orders is experiencing a 500 error due to an HTTP read timeout, which likely indicates resource saturation or mismanagement. The high CPU utilization (94%) and long p99 latency (12.3s) suggest that the inventory service might be under heavy load. Past incidents indicate that resource exhaustion can lead to similar errors.',
  rounds_taken: 1,
  severity: 'SEV3',
  severity_reason: 'Minor degradation with limited impact, primarily affecting order processing.',
  title: 'Inventory Service Resource Saturation Causes Order Processing Failures',
  tags: ['timeout', 'cpu-utilization', 'scaling'],
  tldr: 'The incident was caused by resource saturation in the inventory service leading to read timeouts. The fix involves scaling up the inventory service to handle increased load and reduce CPU utilization.',
  postmortem_markdown: `## Summary
A timeout error occurred in the inventory service, causing order creation failures due to high CPU utilization and long p99 latency.

## Impact
- Order processing was delayed or failed for some users.
- Metrics showed high CPU usage (94%) and memory usage (87%).

## Root Cause
Resource Saturation of Inventory Service: The inventory service was under heavy load, leading to read timeouts when processing order requests. This could be due to insufficient scaling or resource mismanagement.

## Resolution
Increase Inventory Service Scaling: Scale up the inventory service to handle increased load and reduce CPU utilization.

## Action Items
- [ ] Review current scaling strategies for the inventory service.
- [ ] Implement auto-scaling rules based on CPU and memory usage thresholds.
- [ ] Monitor system performance post-scaling to ensure stability.`,
}
