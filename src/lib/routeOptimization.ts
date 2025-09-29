import { Task, Route } from '../../data/types';

export interface Location {
  id: string;
  name: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  priority: 'low' | 'medium' | 'high';
  timeWindow?: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  serviceTime: number; // minutes
}

export interface OptimizationResult {
  optimizedRoute: Location[];
  totalDistance: number;
  estimatedTime: number;
  savings: {
    distance: number;
    time: number;
  };
}

export interface RouteOptimizationOptions {
  startLocation: Location;
  endLocation?: Location;
  maxStops: number;
  timeConstraints: {
    maxWorkingHours: number;
    breakTime: number;
  };
  vehicleType: 'car' | 'motorcycle' | 'truck';
  trafficConsideration: boolean;
}

export class RouteOptimizer {
  private static readonly EARTH_RADIUS_KM = 6371;

  // Average speeds in km/h for different vehicle types
  private static readonly AVERAGE_SPEEDS = {
    car: 40,
    motorcycle: 35,
    truck: 30
  };

  // Traffic multipliers by time of day
  private static readonly TRAFFIC_MULTIPLIERS = {
    '07:00-09:00': 1.5,
    '09:00-11:00': 1.2,
    '11:00-14:00': 1.0,
    '14:00-16:00': 1.1,
    '16:00-18:00': 1.4,
    '18:00-20:00': 1.3,
    '20:00-07:00': 0.9
  };

  static calculateDistance(loc1: Location, loc2: Location): number {
    const lat1Rad = (loc1.coordinates.latitude * Math.PI) / 180;
    const lat2Rad = (loc2.coordinates.latitude * Math.PI) / 180;
    const deltaLat = ((loc2.coordinates.latitude - loc1.coordinates.latitude) * Math.PI) / 180;
    const deltaLng = ((loc2.coordinates.longitude - loc1.coordinates.longitude) * Math.PI) / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return RouteOptimizer.EARTH_RADIUS_KM * c;
  }

  static estimateTime(
    distance: number,
    vehicleType: 'car' | 'motorcycle' | 'truck',
    currentTime: string,
    withTraffic: boolean = true
  ): number {
    const baseSpeed = RouteOptimizer.AVERAGE_SPEEDS[vehicleType];
    let travelTime = (distance / baseSpeed) * 60; // minutes

    if (withTraffic) {
      const trafficMultiplier = RouteOptimizer.getTrafficMultiplier(currentTime);
      travelTime *= trafficMultiplier;
    }

    return Math.round(travelTime);
  }

  private static getTrafficMultiplier(time: string): number {
    const hour = parseInt(time.split(':')[0]);

    if (hour >= 7 && hour < 9) return RouteOptimizer.TRAFFIC_MULTIPLIERS['07:00-09:00'];
    if (hour >= 9 && hour < 11) return RouteOptimizer.TRAFFIC_MULTIPLIERS['09:00-11:00'];
    if (hour >= 11 && hour < 14) return RouteOptimizer.TRAFFIC_MULTIPLIERS['11:00-14:00'];
    if (hour >= 14 && hour < 16) return RouteOptimizer.TRAFFIC_MULTIPLIERS['14:00-16:00'];
    if (hour >= 16 && hour < 18) return RouteOptimizer.TRAFFIC_MULTIPLIERS['16:00-18:00'];
    if (hour >= 18 && hour < 20) return RouteOptimizer.TRAFFIC_MULTIPLIERS['18:00-20:00'];
    return RouteOptimizer.TRAFFIC_MULTIPLIERS['20:00-07:00'];
  }

  static optimizeRoute(
    locations: Location[],
    options: RouteOptimizationOptions
  ): OptimizationResult {
    if (locations.length <= 1) {
      return {
        optimizedRoute: locations,
        totalDistance: 0,
        estimatedTime: 0,
        savings: { distance: 0, time: 0 }
      };
    }

    // Apply constraints
    const filteredLocations = locations.slice(0, options.maxStops);

    // Sort by priority first
    const prioritySorted = [...filteredLocations].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Apply different optimization strategies based on problem size
    let optimizedRoute: Location[];

    if (prioritySorted.length <= 10) {
      // Use nearest neighbor with 2-opt improvement for small problems
      optimizedRoute = RouteOptimizer.nearestNeighborWithTwoOpt(
        options.startLocation,
        prioritySorted,
        options
      );
    } else {
      // Use greedy nearest neighbor for larger problems
      optimizedRoute = RouteOptimizer.greedyNearestNeighbor(
        options.startLocation,
        prioritySorted,
        options
      );
    }

    // Apply time window constraints
    optimizedRoute = RouteOptimizer.applyTimeWindowConstraints(optimizedRoute);

    // Calculate metrics
    const originalDistance = RouteOptimizer.calculateTotalDistance([
      options.startLocation,
      ...filteredLocations
    ]);

    const optimizedDistance = RouteOptimizer.calculateTotalDistance([
      options.startLocation,
      ...optimizedRoute
    ]);

    const estimatedTime = RouteOptimizer.calculateTotalTime(
      [options.startLocation, ...optimizedRoute],
      options.vehicleType,
      options.trafficConsideration
    );

    return {
      optimizedRoute,
      totalDistance: optimizedDistance,
      estimatedTime,
      savings: {
        distance: originalDistance - optimizedDistance,
        time: RouteOptimizer.calculateTotalTime(
          [options.startLocation, ...filteredLocations],
          options.vehicleType,
          options.trafficConsideration
        ) - estimatedTime
      }
    };
  }

  private static nearestNeighborWithTwoOpt(
    start: Location,
    locations: Location[],
    options: RouteOptimizationOptions
  ): Location[] {
    // Start with nearest neighbor
    let route = RouteOptimizer.greedyNearestNeighbor(start, locations, options);

    // Apply 2-opt improvements
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < route.length - 1; i++) {
        for (let j = i + 2; j < route.length; j++) {
          const newRoute = RouteOptimizer.twoOptSwap(route, i, j);
          const currentDistance = RouteOptimizer.calculateTotalDistance([start, ...route]);
          const newDistance = RouteOptimizer.calculateTotalDistance([start, ...newRoute]);

          if (newDistance < currentDistance) {
            route = newRoute;
            improved = true;
          }
        }
      }
    }

    return route;
  }

  private static twoOptSwap(route: Location[], i: number, j: number): Location[] {
    const newRoute = [...route];
    const segment = newRoute.slice(i + 1, j + 1).reverse();
    newRoute.splice(i + 1, j - i, ...segment);
    return newRoute;
  }

  private static greedyNearestNeighbor(
    start: Location,
    locations: Location[],
    options: RouteOptimizationOptions
  ): Location[] {
    const unvisited = [...locations];
    const route: Location[] = [];
    let current = start;

    while (unvisited.length > 0) {
      let nearest = unvisited[0];
      let minDistance = RouteOptimizer.calculateDistance(current, nearest);

      for (let i = 1; i < unvisited.length; i++) {
        const distance = RouteOptimizer.calculateDistance(current, unvisited[i]);

        // Consider priority in distance calculation
        const priorityWeight = unvisited[i].priority === 'high' ? 0.8 :
                              unvisited[i].priority === 'medium' ? 0.9 : 1.0;
        const weightedDistance = distance * priorityWeight;

        if (weightedDistance < minDistance * (nearest.priority === 'high' ? 0.8 :
                                           nearest.priority === 'medium' ? 0.9 : 1.0)) {
          nearest = unvisited[i];
          minDistance = distance;
        }
      }

      route.push(nearest);
      current = nearest;
      unvisited.splice(unvisited.indexOf(nearest), 1);
    }

    return route;
  }

  private static applyTimeWindowConstraints(route: Location[]): Location[] {
    // Sort locations with time windows by their start time
    const constrainedLocations = route.filter(loc => loc.timeWindow);
    const unconstrainedLocations = route.filter(loc => !loc.timeWindow);

    constrainedLocations.sort((a, b) => {
      const timeA = a.timeWindow!.start.split(':').map(Number);
      const timeB = b.timeWindow!.start.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

    // Merge constrained and unconstrained locations
    const result: Location[] = [];
    let constrainedIndex = 0;
    let unconstrainedIndex = 0;

    while (constrainedIndex < constrainedLocations.length ||
           unconstrainedIndex < unconstrainedLocations.length) {

      if (constrainedIndex < constrainedLocations.length) {
        result.push(constrainedLocations[constrainedIndex++]);
      }

      // Insert unconstrained locations between constrained ones
      if (unconstrainedIndex < unconstrainedLocations.length &&
          (constrainedIndex >= constrainedLocations.length || Math.random() > 0.5)) {
        result.push(unconstrainedLocations[unconstrainedIndex++]);
      }
    }

    return result;
  }

  private static calculateTotalDistance(locations: Location[]): number {
    let total = 0;
    for (let i = 0; i < locations.length - 1; i++) {
      total += RouteOptimizer.calculateDistance(locations[i], locations[i + 1]);
    }
    return total;
  }

  private static calculateTotalTime(
    locations: Location[],
    vehicleType: 'car' | 'motorcycle' | 'truck',
    withTraffic: boolean
  ): number {
    let totalTime = 0;
    let currentTime = '09:00'; // Start time

    for (let i = 0; i < locations.length - 1; i++) {
      const distance = RouteOptimizer.calculateDistance(locations[i], locations[i + 1]);
      const travelTime = RouteOptimizer.estimateTime(distance, vehicleType, currentTime, withTraffic);

      totalTime += travelTime + (locations[i + 1].serviceTime || 0);

      // Update current time for traffic calculation
      const [hours, minutes] = currentTime.split(':').map(Number);
      const newMinutes = minutes + travelTime + (locations[i + 1].serviceTime || 0);
      const newHours = hours + Math.floor(newMinutes / 60);
      currentTime = `${String(newHours % 24).padStart(2, '0')}:${String(newMinutes % 60).padStart(2, '0')}`;
    }

    return totalTime;
  }

  static createLocationFromTask(task: Task): Location {
    // Extract coordinates from task location string (simplified)
    const coordinates = RouteOptimizer.parseLocationString(task.location);

    return {
      id: task.id,
      name: task.title,
      address: task.location,
      coordinates,
      priority: task.priority === 'urgent' ? 'high' :
                task.priority === 'high' ? 'medium' : 'low',
      serviceTime: 15, // Default 15 minutes service time
      timeWindow: task.due_date ? RouteOptimizer.createTimeWindow(task.due_date) : undefined
    };
  }

  private static parseLocationString(location: string): { latitude: number; longitude: number } {
    // Simplified location parsing - in a real app, you'd use geocoding
    // For demo purposes, return Tel Aviv area coordinates with some variation
    const baseLatitude = 32.0853;
    const baseLongitude = 34.7818;

    // Create variation based on location string hash
    const hash = location.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    const latVariation = (hash % 100) / 1000; // ±0.05 degrees
    const lngVariation = ((hash >> 8) % 100) / 1000;

    return {
      latitude: baseLatitude + latVariation,
      longitude: baseLongitude + lngVariation
    };
  }

  private static createTimeWindow(dueDate: string): { start: string; end: string } | undefined {
    const due = new Date(dueDate);
    const startHour = Math.max(8, due.getHours() - 2);
    const endHour = Math.min(18, due.getHours() + 2);

    return {
      start: `${String(startHour).padStart(2, '0')}:00`,
      end: `${String(endHour).padStart(2, '0')}:00`
    };
  }
}