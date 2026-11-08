import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Check,
  CircleAlert,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CheckoutButton, CheckoutLoadingState, CheckoutNotice } from './CheckoutDesignSystem';
import ShippingAddressForm from './ShippingAddressForm';
import type { ShippingAddress, ShippingAddressInput } from './shippingAddressService';

type Props = {
  addresses: ShippingAddress[];
  selectedAddress: ShippingAddress | null;
  emailFallback: string;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelect: (addressId: string) => void;
  onSave: (
    addressId: string | null,
    input: ShippingAddressInput,
    makeDefault: boolean,
  ) => Promise<ShippingAddress>;
  onDelete: (address: ShippingAddress) => Promise<void>;
  onMakeDefault: (addressId: string) => Promise<void>;
};

function AddressLines({ address }: { address: ShippingAddress }) {
  return (
    <div className="shipping-address-lines">
      <strong>{address.full_name}</strong>
      <span>
        {address.street_address}
        {address.apartment ? `, ${address.apartment}` : ''}
      </span>
      <span>
        {address.city}, {address.region} {address.postal_code}
      </span>
      <span>{address.country}</span>
      <span>
        {address.phone} · {address.email}
      </span>
      {address.delivery_notes && <small>Note: {address.delivery_notes}</small>}
    </div>
  );
}

export default function ShippingAddressBook({
  addresses,
  selectedAddress,
  emailFallback,
  isLoading,
  error,
  onRetry,
  onSelect,
  onSave,
  onDelete,
  onMakeDefault,
}: Props) {
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ShippingAddress | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const editorTriggerRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (pendingDelete && !dialog.open) dialog.showModal();
    if (!pendingDelete && dialog.open) dialog.close();
  }, [pendingDelete]);

  const closeEditor = () => {
    setEditingAddress(null);
    setIsAddingAddress(false);
    setOperationError(null);
    window.requestAnimationFrame(() => {
      if (editorTriggerRef.current?.isConnected) editorTriggerRef.current.focus();
    });
  };

  const handleSave = async (
    addressId: string | null,
    input: ShippingAddressInput,
    makeDefault: boolean,
  ): Promise<ShippingAddress> => {
    setIsSaving(true);
    setOperationError(null);
    try {
      const savedAddress = await onSave(addressId, input, makeDefault);
      setNotice({
        tone: 'success',
        message: addressId ? 'Your address has been updated.' : 'Your address has been saved.',
      });
      return savedAddress;
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : 'Your address could not be saved.';
      setOperationError(message);
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    setNotice(null);
    try {
      await onDelete(pendingDelete);
      setNotice({
        tone: 'success',
        message: 'The address has been removed from your address book.',
      });
      setPendingDelete(null);
    } catch (deleteError) {
      setDeleteError(
        deleteError instanceof Error ? deleteError.message : 'The address could not be deleted.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMakeDefault = async (address: ShippingAddress) => {
    setIsSettingDefault(address.id);
    setNotice(null);
    try {
      await onMakeDefault(address.id);
      onSelect(address.id);
      setNotice({ tone: 'success', message: `${address.full_name} is now your default address.` });
    } catch (defaultError) {
      setNotice({
        tone: 'error',
        message:
          defaultError instanceof Error
            ? defaultError.message
            : 'Your default address could not be changed.',
      });
    } finally {
      setIsSettingDefault(null);
    }
  };

  return (
    <section className="shipping-address-book" aria-label="Shipping address book">
      <div className="shipping-address-book-heading">
        <div>
          <p className="checkout-eyebrow">YOUR ADDRESS BOOK</p>
          <h3>Choose where it should arrive.</h3>
          <p>Select a saved address or add a new one for this delivery.</p>
        </div>
        {!isAddingAddress && !editingAddress && (
          <button
            type="button"
            className="shipping-add-address"
            disabled={isLoading}
            onClick={(event) => {
              setNotice(null);
              editorTriggerRef.current = event.currentTarget;
              setIsAddingAddress(true);
            }}
          >
            <Plus size={16} aria-hidden="true" />
            Add address
          </button>
        )}
      </div>

      {notice && (
        <div
          className={`shipping-operation-notice is-${notice.tone}`}
          role={notice.tone === 'error' ? 'alert' : 'status'}
        >
          {notice.tone === 'success' ? (
            <Check size={16} aria-hidden="true" />
          ) : (
            <CircleAlert size={16} aria-hidden="true" />
          )}
          <span>{notice.message}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setNotice(null)}>
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      )}

      {error && (
        <>
          <CheckoutNotice tone="error" title="Address book unavailable">
            {error}
          </CheckoutNotice>
          <button className="shipping-inline-retry" type="button" onClick={onRetry}>
            Try again
          </button>
        </>
      )}

      {isLoading ? (
        <CheckoutLoadingState />
      ) : addresses.length === 0 && !error ? (
        <motion.div
          className="shipping-address-empty"
          initial={reduceMotion ? false : { opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22 }}
        >
          <span className="shipping-address-empty-icon">
            <MapPin size={22} aria-hidden="true" />
          </span>
          <div>
            <strong>Your address book is ready.</strong>
            <p>Add a delivery address to continue. You can save several for next time.</p>
          </div>
          {!isAddingAddress && (
            <CheckoutButton
              onClick={(event) => {
                setNotice(null);
                editorTriggerRef.current = event.currentTarget;
                setIsAddingAddress(true);
              }}
            >
              <Plus size={16} aria-hidden="true" /> Add your first address
            </CheckoutButton>
          )}
        </motion.div>
      ) : addresses.length === 0 ? null : (
        <fieldset className="shipping-address-list">
          <legend className="visually-hidden">Choose a delivery address</legend>
          <AnimatePresence initial={false}>
            {addresses.map((address, index) => {
              const isSelected = selectedAddress?.id === address.id;
              return (
                <motion.article
                  className={`shipping-address-card${isSelected ? ' is-selected' : ''}`}
                  key={address.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.22,
                    delay: reduceMotion ? 0 : index * 0.035,
                  }}
                  whileHover={reduceMotion ? undefined : { y: -2 }}
                >
                  <label
                    className="shipping-address-select"
                    htmlFor={`shipping-address-${address.id}`}
                  >
                    <input
                      id={`shipping-address-${address.id}`}
                      type="radio"
                      name="shipping-address"
                      value={address.id}
                      checked={isSelected}
                      onChange={() => onSelect(address.id)}
                    />
                    <span className="shipping-radio-indicator" aria-hidden="true">
                      <Check size={12} />
                    </span>
                    <span className="shipping-address-card-content">
                      <span className="shipping-address-card-title">
                        <AddressLines address={address} />
                        {address.is_default && (
                          <span className="shipping-default-badge">
                            <Star size={11} aria-hidden="true" fill="currentColor" />
                            Default
                          </span>
                        )}
                      </span>
                    </span>
                  </label>
                  <div
                    className="shipping-address-card-actions"
                    role="group"
                    aria-label={`Actions for ${address.full_name}`}
                  >
                    {!address.is_default && (
                      <button
                        type="button"
                        className="shipping-address-action"
                        disabled={Boolean(isSettingDefault)}
                        onClick={() => void handleMakeDefault(address)}
                      >
                        {isSettingDefault === address.id ? (
                          <LoaderCircle className="shipping-spinner" size={14} aria-hidden="true" />
                        ) : (
                          <Star size={14} aria-hidden="true" />
                        )}
                        Set default
                      </button>
                    )}
                    <button
                      type="button"
                      className="shipping-address-icon-action"
                      aria-label={`Edit address for ${address.full_name}`}
                      title="Edit address"
                      disabled={isSaving || isDeleting || Boolean(isSettingDefault)}
                      onClick={(event) => {
                        setNotice(null);
                        setOperationError(null);
                        editorTriggerRef.current = event.currentTarget;
                        setEditingAddress(address);
                        setIsAddingAddress(false);
                      }}
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="shipping-address-icon-action is-danger"
                      aria-label={`Delete address for ${address.full_name}`}
                      title="Delete address"
                      disabled={isSaving || isDeleting || Boolean(isSettingDefault)}
                      onClick={() => {
                        setNotice(null);
                        setDeleteError(null);
                        setPendingDelete(address);
                      }}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </fieldset>
      )}

      <AnimatePresence initial={false}>
        {(isAddingAddress || editingAddress) && (
          <ShippingAddressForm
            key={editingAddress?.id ?? 'new'}
            initialAddress={editingAddress}
            emailFallback={emailFallback}
            makeDefaultInitially={editingAddress?.is_default ?? addresses.length === 0}
            isSaving={isSaving}
            error={operationError}
            onSave={handleSave}
            onCancel={closeEditor}
            onSaved={(address) => {
              onSelect(address.id);
              closeEditor();
            }}
          />
        )}
      </AnimatePresence>

      {selectedAddress && !isLoading && (
        <div className="shipping-selected-summary" role="status">
          <span>
            <Check size={14} aria-hidden="true" />
          </span>
          <p>
            <strong>Delivering to {selectedAddress.full_name}</strong>
            {selectedAddress.city}, {selectedAddress.region} {selectedAddress.postal_code}
          </p>
        </div>
      )}

      <dialog
        ref={dialogRef}
        className="shipping-delete-dialog"
        onCancel={(event) => {
          event.preventDefault();
          if (!isDeleting) {
            setPendingDelete(null);
            setDeleteError(null);
          }
        }}
        onClose={() => {
          if (pendingDelete && !isDeleting) {
            setPendingDelete(null);
            setDeleteError(null);
          }
        }}
      >
        {pendingDelete && (
          <div className="shipping-delete-content">
            <button
              className="shipping-address-close"
              type="button"
              aria-label="Cancel delete"
              onClick={() => setPendingDelete(null)}
              disabled={isDeleting}
            >
              <X size={17} aria-hidden="true" />
            </button>
            <span className="shipping-delete-icon">
              <Trash2 size={20} aria-hidden="true" />
            </span>
            <p className="checkout-eyebrow">ADDRESS BOOK</p>
            <h3>Remove this address?</h3>
            <p>
              <strong>{pendingDelete.full_name}</strong> and its delivery details will be removed
              from your saved addresses.
              {pendingDelete.is_default && addresses.length > 1
                ? ' Another saved address will become your default.'
                : ''}
            </p>
            {deleteError && (
              <CheckoutNotice tone="error" title="Address not removed">
                {deleteError}
              </CheckoutNotice>
            )}
            <div className="shipping-delete-actions">
              <button
                type="button"
                className="checkout-button checkout-button--secondary"
                onClick={() => setPendingDelete(null)}
                disabled={isDeleting}
              >
                Keep address
              </button>
              <button
                type="button"
                className="checkout-button shipping-confirm-delete"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <LoaderCircle className="shipping-spinner" size={15} aria-hidden="true" />
                ) : (
                  <Trash2 size={15} aria-hidden="true" />
                )}
                {isDeleting ? 'Removing…' : 'Remove address'}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
