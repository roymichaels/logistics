import { useAuth } from "./useAuth";
import { useDataStore } from "./useDataStore";
import { useNavigation } from "./useNavigation";
import { useDomain } from "./useDomain";

export const useApp = () => {
  const auth = useAuth();
  const db = useDataStore();
  const nav = useNavigation();
  const domain = useDomain();

  return {
    auth,
    db,
    nav,
    orders: {
      getOrders: domain.orders.queries.getOrders.bind(domain.orders.queries),
      getOrderById: domain.orders.queries.getOrderById.bind(domain.orders.queries),
      getOrderStats: domain.orders.queries.getOrderStats.bind(domain.orders.queries),
      createOrder: domain.orders.commands.createOrder.bind(domain.orders.commands),
      assignOrder: domain.orders.commands.assignOrder.bind(domain.orders.commands),
      updateOrderStatus: domain.orders.commands.updateOrderStatus.bind(domain.orders.commands),
      cancelOrder: domain.orders.commands.cancelOrder.bind(domain.orders.commands),
    },
    drivers: {
      getDrivers: domain.drivers.queries.getDrivers.bind(domain.drivers.queries),
      getDriverById: domain.drivers.queries.getDriverById.bind(domain.drivers.queries),
      getAvailableDriversNearby: domain.drivers.queries.getAvailableDriversNearby.bind(domain.drivers.queries),
      startShift: domain.drivers.commands.startShift.bind(domain.drivers.commands),
      endShift: domain.drivers.commands.endShift.bind(domain.drivers.commands),
      updateLocation: domain.drivers.commands.updateLocation.bind(domain.drivers.commands),
      acceptDelivery: domain.drivers.commands.acceptDelivery.bind(domain.drivers.commands),
      completeDelivery: domain.drivers.commands.completeDelivery.bind(domain.drivers.commands),
    },
    business: {
      getBusinesses: domain.business.queries.getBusinesses.bind(domain.business.queries),
      getBusinessById: domain.business.queries.getBusinessById.bind(domain.business.queries),
      getUserBusinesses: domain.business.queries.getUserBusinesses.bind(domain.business.queries),
      createBusiness: domain.business.commands.createBusiness.bind(domain.business.commands),
      switchBusiness: domain.business.commands.switchBusiness.bind(domain.business.commands),
      updateBusiness: domain.business.commands.updateBusiness.bind(domain.business.commands),
    },
    catalog: {
      getProducts: domain.catalog.queries.getProducts.bind(domain.catalog.queries),
      getProductById: domain.catalog.queries.getProductById.bind(domain.catalog.queries),
      getCategories: domain.catalog.queries.getCategories.bind(domain.catalog.queries),
      createProduct: domain.catalog.commands.createProduct.bind(domain.catalog.commands),
      updateProduct: domain.catalog.commands.updateProduct.bind(domain.catalog.commands),
      deleteProduct: domain.catalog.commands.deleteProduct.bind(domain.catalog.commands),
    },
    inventory: {
      getInventory: domain.inventory.queries.getInventory.bind(domain.inventory.queries),
      getInventoryById: domain.inventory.queries.getInventoryById.bind(domain.inventory.queries),
      getLowStockItems: domain.inventory.queries.getLowStockItems.bind(domain.inventory.queries),
      restock: domain.inventory.commands.restock.bind(domain.inventory.commands),
      adjustStock: domain.inventory.commands.adjustStock.bind(domain.inventory.commands),
      setReorderLevel: domain.inventory.commands.setReorderLevel.bind(domain.inventory.commands),
    },
    messaging: {
      getConversations: domain.messaging.queries.getConversations.bind(domain.messaging.queries),
      getMessages: domain.messaging.queries.getMessages.bind(domain.messaging.queries),
      getUnreadCount: domain.messaging.queries.getUnreadCount.bind(domain.messaging.queries),
      sendMessage: domain.messaging.commands.sendMessage.bind(domain.messaging.commands),
      createRoom: domain.messaging.commands.createRoom.bind(domain.messaging.commands),
      markAsRead: domain.messaging.commands.markAsRead.bind(domain.messaging.commands),
    },
  };
};
