/**
 * AI-Powered Routing Engine
 * Intelligent message routing with path optimization and learning
 */

import {
  Route,
  RouteScore,
  RoutingTable,
  Peer,
  MeshNode,
  NetworkTopology,
  Message,
  RoutingError
} from '../../types';

export class RoutingEngine {
  private routingTable: Map<string, Route[]> = new Map();
  private routeHistory: Map<string, RouteMetrics> = new Map();
  private learningRate: number = 0.1;

  /**
   * Find the best route to a destination
   */
  findRoute(destination: string, topology: NetworkTopology): Route | null {
    // Get all possible routes to destination
    const routes = this.calculateRoutes(destination, topology);

    if (routes.length === 0) {
      return null;
    }

    // Score all routes
    const scoredRoutes = routes.map((route) => ({
      route,
      score: this.scoreRoute(route, topology),
    }));

    // Sort by score (higher is better)
    scoredRoutes.sort((a, b) => b.score.totalScore - a.score.totalScore);

    // Return best route
    const bestRoute = scoredRoutes[0].route;

    // Update routing table
    this.addRoute(destination, bestRoute);

    return bestRoute;
  }

  /**
   * Calculate all possible routes to destination using Dijkstra's algorithm
   */
  private calculateRoutes(
    destination: string,
    topology: NetworkTopology
  ): Route[] {
    const routes: Route[] = [];
    const nodes = topology.nodes;

    // Get self node ID (assuming first node is self)
    const selfId = Array.from(nodes.keys())[0];
    if (!selfId) {
      return routes;
    }

    // Check if destination exists
    if (!nodes.has(destination)) {
      return routes;
    }

    // BFS to find all paths
    const paths = this.findAllPaths(selfId, destination, topology, 10); // Max 10 hops

    // Convert paths to routes
    paths.forEach((path) => {
      const route: Route = {
        destination,
        hops: path,
        estimatedLatency: this.estimateLatency(path, topology),
        reliability: this.estimateReliability(path, topology),
        cost: this.calculateCost(path, topology),
        lastUsed: 0,
        successCount: 0,
        failureCount: 0,
      };
      routes.push(route);
    });

    return routes;
  }

  /**
   * Find all paths between source and destination (BFS with path tracking)
   */
  private findAllPaths(
    source: string,
    destination: string,
    topology: NetworkTopology,
    maxHops: number
  ): string[][] {
    const paths: string[][] = [];
    const queue: { node: string; path: string[] }[] = [
      { node: source, path: [source] },
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.path.length > maxHops) {
        continue;
      }

      if (current.node === destination) {
        paths.push(current.path);
        continue;
      }

      visited.add(current.node);

      const node = topology.nodes.get(current.node);
      if (!node) continue;

      // Get neighbors
      const neighbors = this.getNeighbors(current.node, topology);

      for (const neighborId of neighbors) {
        if (!current.path.includes(neighborId)) {
          queue.push({
            node: neighborId,
            path: [...current.path, neighborId],
          });
        }
      }
    }

    return paths;
  }

  /**
   * Get neighbors of a node
   */
  private getNeighbors(nodeId: string, topology: NetworkTopology): string[] {
    const neighbors: string[] = [];

    topology.edges.forEach((edge) => {
      if (edge.from === nodeId) {
        neighbors.push(edge.to);
      } else if (edge.to === nodeId) {
        neighbors.push(edge.from);
      }
    });

    return neighbors;
  }

  /**
   * Score a route based on multiple factors
   */
  scoreRoute(route: Route, topology: NetworkTopology): RouteScore {
    const hopCount = route.hops.length;
    const avgSignalStrength = this.calculateAvgSignalStrength(route, topology);
    const latency = route.estimatedLatency;
    const reliability = route.reliability;
    const batteryImpact = this.estimateBatteryImpact(route, topology);
    const congestion = this.estimateCongestion(route, topology);

    // Historical performance
    const history = this.routeHistory.get(this.routeKey(route));
    const historicalReliability = history
      ? history.successCount / (history.successCount + history.failureCount)
      : 0.5;

    // Weighted scoring
    const weights = {
      hopCount: 0.15,
      signalStrength: 0.20,
      latency: 0.20,
      reliability: 0.20,
      batteryImpact: 0.10,
      congestion: 0.15,
    };

    const scores = {
      hopCount: (10 - Math.min(hopCount, 10)) / 10, // Fewer hops is better
      signalStrength: avgSignalStrength / 100,
      latency: 1 - Math.min(latency / 1000, 1), // Lower latency is better
      reliability: reliability * historicalReliability,
      batteryImpact: 1 - batteryImpact / 100,
      congestion: 1 - congestion / 100,
    };

    const totalScore =
      scores.hopCount * weights.hopCount +
      scores.signalStrength * weights.signalStrength +
      scores.latency * weights.latency +
      scores.reliability * weights.reliability +
      scores.batteryImpact * weights.batteryImpact +
      scores.congestion * weights.congestion;

    return {
      signalStrength: avgSignalStrength,
      latency,
      hopCount,
      reliability,
      batteryImpact,
      congestion,
      totalScore: totalScore * 100,
    };
  }

  /**
   * Calculate average signal strength along route
   */
  private calculateAvgSignalStrength(
    route: Route,
    topology: NetworkTopology
  ): number {
    if (route.hops.length < 2) return 100;

    let totalStrength = 0;
    let count = 0;

    for (let i = 0; i < route.hops.length - 1; i++) {
      const edge = topology.edges.find(
        (e) =>
          (e.from === route.hops[i] && e.to === route.hops[i + 1]) ||
          (e.to === route.hops[i] && e.from === route.hops[i + 1])
      );

      if (edge) {
        totalStrength += edge.quality.signalStrength;
        count++;
      }
    }

    return count > 0 ? totalStrength / count : 50;
  }

  /**
   * Estimate latency for route
   */
  private estimateLatency(route: Route, topology: NetworkTopology): number {
    if (route.hops.length < 2) return 10;

    let totalLatency = 0;

    for (let i = 0; i < route.hops.length - 1; i++) {
      const edge = topology.edges.find(
        (e) =>
          (e.from === route.hops[i] && e.to === route.hops[i + 1]) ||
          (e.to === route.hops[i] && e.from === route.hops[i + 1])
      );

      if (edge) {
        totalLatency += edge.quality.latency;
      } else {
        totalLatency += 100; // Default latency
      }
    }

    return totalLatency;
  }

  /**
   * Estimate reliability for route
   */
  private estimateReliability(route: Route, topology: NetworkTopology): number {
    if (route.hops.length < 2) return 1.0;

    let totalReliability = 1.0;

    for (let i = 0; i < route.hops.length - 1; i++) {
      const edge = topology.edges.find(
        (e) =>
          (e.from === route.hops[i] && e.to === route.hops[i + 1]) ||
          (e.to === route.hops[i] && e.from === route.hops[i + 1])
      );

      if (edge) {
        totalReliability *= edge.quality.reliability;
      } else {
        totalReliability *= 0.5; // Unknown connection
      }
    }

    return totalReliability;
  }

  /**
   * Calculate route cost
   */
  private calculateCost(route: Route, topology: NetworkTopology): number {
    // Cost is a combination of hops, latency, and reliability
    return (
      route.hops.length * 10 +
      this.estimateLatency(route, topology) / 10 +
      (1 - this.estimateReliability(route, topology)) * 100
    );
  }

  /**
   * Estimate battery impact
   */
  private estimateBatteryImpact(
    route: Route,
    topology: NetworkTopology
  ): number {
    // More hops = more battery usage
    return Math.min(route.hops.length * 10, 100);
  }

  /**
   * Estimate congestion
   */
  private estimateCongestion(route: Route, topology: NetworkTopology): number {
    // TODO: Track actual message throughput per node
    // For now, estimate based on node connection count
    let totalCongestion = 0;
    route.hops.forEach((hopId) => {
      const node = topology.nodes.get(hopId);
      if (node) {
        totalCongestion += node.connections.length * 10;
      }
    });
    return Math.min(totalCongestion / route.hops.length, 100);
  }

  /**
   * Learn from route performance
   */
  learnFromHistory(route: Route, actualLatency: number, success: boolean): void {
    const key = this.routeKey(route);
    const existing = this.routeHistory.get(key);

    if (existing) {
      // Update with exponential moving average
      existing.avgLatency =
        existing.avgLatency * (1 - this.learningRate) +
        actualLatency * this.learningRate;

      if (success) {
        existing.successCount++;
      } else {
        existing.failureCount++;
      }
    } else {
      // Create new history entry
      this.routeHistory.set(key, {
        avgLatency: actualLatency,
        successCount: success ? 1 : 0,
        failureCount: success ? 0 : 1,
      });
    }

    // Update route in routing table
    const routes = this.routingTable.get(route.destination);
    if (routes) {
      const existingRoute = routes.find((r) => this.routeKey(r) === key);
      if (existingRoute) {
        existingRoute.estimatedLatency = actualLatency;
        existingRoute.lastUsed = Date.now();
        if (success) {
          existingRoute.successCount++;
        } else {
          existingRoute.failureCount++;
        }
      }
    }
  }

  /**
   * Add route to routing table
   */
  addRoute(destination: string, route: Route): void {
    const routes = this.routingTable.get(destination) || [];
    const key = this.routeKey(route);

    // Remove duplicate if exists
    const index = routes.findIndex((r) => this.routeKey(r) === key);
    if (index >= 0) {
      routes.splice(index, 1);
    }

    // Add route
    routes.push(route);

    // Keep only top 5 routes per destination
    routes.sort((a, b) => b.reliability - a.reliability);
    if (routes.length > 5) {
      routes.length = 5;
    }

    this.routingTable.set(destination, routes);
  }

  /**
   * Get routes to destination
   */
  getRoutes(destination: string): Route[] {
    return this.routingTable.get(destination) || [];
  }

  /**
   * Remove route
   */
  removeRoute(destination: string, route: Route): void {
    const routes = this.routingTable.get(destination);
    if (routes) {
      const key = this.routeKey(route);
      const index = routes.findIndex((r) => this.routeKey(r) === key);
      if (index >= 0) {
        routes.splice(index, 1);
      }
    }
  }

  /**
   * Clear routes to destination
   */
  clearRoutes(destination: string): void {
    this.routingTable.delete(destination);
  }

  /**
   * Clear all routes
   */
  clearAllRoutes(): void {
    this.routingTable.clear();
    this.routeHistory.clear();
  }

  /**
   * Generate unique key for route
   */
  private routeKey(route: Route): string {
    return `${route.destination}:${route.hops.join(',')}`;
  }

  /**
   * Get routing table
   */
  getRoutingTable(): RoutingTable {
    return {
      routes: new Map(this.routingTable),
      lastUpdated: Date.now(),
    };
  }

  /**
   * Export routing table for sharing
   */
  exportRoutingTable(): any {
    const exported: any = {};
    this.routingTable.forEach((routes, destination) => {
      exported[destination] = routes;
    });
    return exported;
  }

  /**
   * Import routing table from peer
   */
  importRoutingTable(data: any): void {
    Object.entries(data).forEach(([destination, routes]) => {
      (routes as Route[]).forEach((route) => {
        this.addRoute(destination, route);
      });
    });
  }
}

interface RouteMetrics {
  avgLatency: number;
  successCount: number;
  failureCount: number;
}

// Singleton instance
export const routingEngine = new RoutingEngine();
