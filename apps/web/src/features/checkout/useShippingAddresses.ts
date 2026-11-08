import { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import {
  deleteShippingAddress,
  loadShippingAddresses,
  saveShippingAddress,
  setDefaultShippingAddress,
  type ShippingAddress,
  type ShippingAddressInput,
} from './shippingAddressService';

type AddressState = {
  userId: string | null;
  addresses: ShippingAddress[];
  isLoading: boolean;
  error: string | null;
};

const INITIAL_STATE: AddressState = {
  userId: null,
  addresses: [],
  isLoading: true,
  error: null,
};

function describeError(error: unknown) {
  return error instanceof Error ? error.message : 'Shipping addresses could not be updated.';
}

export function useShippingAddresses(userId: string | undefined) {
  const [state, setState] = useState<AddressState>(INITIAL_STATE);

  const refresh = useCallback(async () => {
    if (!userId) {
      setState({ userId: null, addresses: [], isLoading: false, error: null });
      return;
    }

    setState((current) => ({
      userId,
      addresses: current.userId === userId ? current.addresses : [],
      isLoading: true,
      error: null,
    }));
    try {
      const client = await getSupabaseClient();
      const addresses = await loadShippingAddresses(client, userId);
      setState({ userId, addresses, isLoading: false, error: null });
    } catch (error) {
      setState((current) => ({
        userId,
        addresses: current.userId === userId ? current.addresses : [],
        isLoading: false,
        error: describeError(error),
      }));
    }
  }, [userId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!userId) {
        if (active) {
          setState({ userId: null, addresses: [], isLoading: false, error: null });
        }
        return;
      }

      try {
        const client = await getSupabaseClient();
        const addresses = await loadShippingAddresses(client, userId);
        if (active) setState({ userId, addresses, isLoading: false, error: null });
      } catch (error) {
        if (active) {
          setState((current) => ({
            userId,
            addresses: current.userId === userId ? current.addresses : [],
            isLoading: false,
            error: describeError(error),
          }));
        }
      }
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const save = useCallback(
    async (
      addressId: string | null,
      input: ShippingAddressInput,
      makeDefault: boolean,
    ): Promise<ShippingAddress> => {
      if (!userId) throw new Error('Sign in to save a shipping address.');
      const client = await getSupabaseClient();
      try {
        return await saveShippingAddress(
          client,
          userId,
          addressId,
          input,
          makeDefault || state.addresses.length === 0,
        );
      } finally {
        await refresh();
      }
    },
    [refresh, state.addresses.length, userId],
  );

  const remove = useCallback(
    async (address: ShippingAddress): Promise<void> => {
      if (!userId) throw new Error('Sign in to manage shipping addresses.');
      const client = await getSupabaseClient();
      try {
        await deleteShippingAddress(client, address.id);
      } finally {
        await refresh();
      }
    },
    [refresh, userId],
  );

  const makeDefault = useCallback(
    async (addressId: string): Promise<void> => {
      if (!userId) throw new Error('Sign in to manage shipping addresses.');
      const client = await getSupabaseClient();
      try {
        await setDefaultShippingAddress(client, addressId);
      } finally {
        await refresh();
      }
    },
    [refresh, userId],
  );

  const isCurrentUser = state.userId === userId;
  return {
    addresses: isCurrentUser ? state.addresses : [],
    isLoading: !isCurrentUser || state.isLoading,
    error: isCurrentUser ? state.error : null,
    refresh,
    save,
    remove,
    makeDefault,
  };
}
