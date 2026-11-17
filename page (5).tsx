import OrdersAdmin from "@/components/OrdersAdmin";

export const metadata = {
  title: "Pedidos · Acceso para dueños",
  description: "Sección privada de pedidos de llaveros personalizados.",
};

export default function PedidosPage() {
  return <OrdersAdmin />;
}
