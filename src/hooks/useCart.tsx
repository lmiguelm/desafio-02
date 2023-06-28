import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

const STORAGE_PREFIX = "@RocketShoes:cart";

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(STORAGE_PREFIX);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productAlreadyExists = cart.find(
        (product) => product.id === productId
      );

      const stock = await api.get<Stock>(`/stock/${productId}`);

      const currentAmount = productAlreadyExists?.amount ?? 0;
      const newAmount = currentAmount + 1;

      if (newAmount >= stock.data.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productAlreadyExists) {
        productAlreadyExists.amount = newAmount;

        setCart((oldstate) =>
          oldstate.map((product) =>
            product.id === productId ? productAlreadyExists : product
          )
        );
      } else {
        const { data: newProduct } = await api.get(`/products/${productId}`);

        setCart((oldstate) => [
          ...oldstate,
          { ...newProduct, amount: newAmount },
        ]);
      }

      localStorage.setItem(STORAGE_PREFIX, JSON.stringify(cart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productAlreadyExists = cart.find(
        (product) => product.id === productId
      );

      if (!productAlreadyExists) {
        throw new Error();
      }

      const newCart = [...cart].filter((product) => product.id !== productId);
      setCart(newCart);
      localStorage.setItem(STORAGE_PREFIX, JSON.stringify(newCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if (stock.amount < amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const newStock = cart.map((product) =>
        product.id === productId ? { ...product, amount } : product
      );

      setCart(newStock);
      localStorage.setItem(STORAGE_PREFIX, JSON.stringify(newStock));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
