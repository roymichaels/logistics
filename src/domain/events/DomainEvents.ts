export type DomainEvent =
  | { type: "OrderAssigned"; orderId: string; driverId: string }
  | { type: "DriverArrived"; orderId: string }
  | { type: "StockLow"; productId: string; quantity: number }
  | { type: "ProductUpdated"; productId: string }
  | { type: "UserRoleChanged"; userId: string; role: string };
