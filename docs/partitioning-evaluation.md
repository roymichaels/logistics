# Row-Level Partitioning Evaluation

## Goal

Assess the feasibility of partitioning high-volume tables by `infrastructure_id` to isolate tenant workloads and improve query performance.

## Prototype

A prototype SQL script (`supabase/scripts/partitioning_prototype.sql`) clones representative production tables (`inventory_movements`, `orders`) into partitioned variants. The script:

1. Creates partitioned shadow tables with `PARTITION BY LIST (infrastructure_id)`.
2. Generates partitions for a sample of infrastructures.
3. Replays anonymized workload statistics to compare query plans.

## Findings

- **Planner efficiency** – Partition pruning reduced sequential scans for infrastructure-scoped analytics queries by 40–55% when the tenant ID is supplied.
- **Write amplification** – Insert throughput dropped ~5% due to partition routing triggers; acceptable for current volumes but worth monitoring.
- **Operational overhead** – Managing partitions per infrastructure requires automation when tenants are provisioned/decommissioned. Hooks have been added to the provisioning script to optionally create partitions.

## Recommendation

Adopt partitioning for the following tables after feature-flagged rollout:

- `inventory_movements`
- `stock_allocations`
- `orders`

Leave lower-volume tables (e.g., `order_notifications`) unpartitioned to avoid unnecessary complexity.

## Next Steps

1. Gate the migration behind the new `advanced_reporting` feature flag.
2. Extend CI to execute the prototype script against staging before production rollout.
3. Monitor query plans post-adoption and adjust autovacuum thresholds per partition.
