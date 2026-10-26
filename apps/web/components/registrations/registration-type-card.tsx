"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useUpdateRegistrationType } from "@/hooks/use-registration-categories";
import type { RegistrationType } from "@/lib/registrations/types";

interface RegistrationTypeCardProps {
  conferenceId: string;
  categoryName: string;
  type: RegistrationType;
}

interface EditValues {
  name: string;
  price: string;
  currency: string;
  startDate: string;
  endDate: string;
  capacity: string;
}

function dateInputValue(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function RegistrationTypeCard({
  conferenceId,
  categoryName,
  type,
}: RegistrationTypeCardProps) {
  const [editing, setEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [values, setValues] = useState<EditValues>(() => ({
    name: type.name,
    price: String(type.price),
    currency: type.currency,
    startDate: dateInputValue(type.startDate),
    endDate: dateInputValue(type.endDate),
    capacity: type.capacity == null ? "" : String(type.capacity),
  }));

  const updateType = useUpdateRegistrationType(conferenceId);

  function startEditing() {
    setErrorMessage("");
    setValues({
      name: type.name,
      price: String(type.price),
      currency: type.currency,
      startDate: dateInputValue(type.startDate),
      endDate: dateInputValue(type.endDate),
      capacity: type.capacity == null ? "" : String(type.capacity),
    });
    setEditing(true);
  }

  function changeValue(field: keyof EditValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!values.name.trim()) {
      setErrorMessage("Please enter a pricing window name.");
      return;
    }

    if (!values.currency.trim()) {
      setErrorMessage("Please enter a currency code.");
      return;
    }

    if (
      values.price.trim() === "" ||
      !Number.isFinite(Number(values.price)) ||
      Number(values.price) < 0
    ) {
      setErrorMessage("Please enter a valid non-negative price.");
      return;
    }

    if (
      !values.startDate ||
      !values.endDate ||
      values.startDate > values.endDate
    ) {
      setErrorMessage("End date must be on or after the start date.");
      return;
    }

    if (
      values.capacity !== "" &&
      (!Number.isInteger(Number(values.capacity)) ||
        Number(values.capacity) < 0)
    ) {
      setErrorMessage("Capacity must be a whole number of zero or more.");
      return;
    }

    try {
      await updateType.mutateAsync({
        categoryId: type.categoryId,
        typeId: type.id,
        name: values.name.trim(),
        price: Number(values.price),
        currency: values.currency.trim().toUpperCase(),
        startDate: values.startDate,
        endDate: values.endDate,
        capacity: values.capacity === "" ? null : Number(values.capacity),
      });

      setEditing(false);
    } catch {
      setErrorMessage(
        "Could not update pricing window. Please check your details and try again.",
      );
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  if (editing) {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-lg font-semibold">Edit pricing window</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Category: {categoryName}
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Pricing window name
              <input
                className={inputClass}
                value={values.name}
                onChange={(event) => changeValue("name", event.target.value)}
                required
                maxLength={150}
              />
            </label>

            <label className="text-sm font-medium">
              Currency
              <input
                className={inputClass}
                value={values.currency}
                onChange={(event) =>
                  changeValue("currency", event.target.value)
                }
                required
                maxLength={3}
              />
            </label>

            <label className="text-sm font-medium">
              Price
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={values.price}
                onChange={(event) => changeValue("price", event.target.value)}
                required
              />
            </label>

            <label className="text-sm font-medium">
              Capacity (leave empty for unlimited)
              <input
                className={inputClass}
                type="number"
                min="0"
                step="1"
                value={values.capacity}
                onChange={(event) =>
                  changeValue("capacity", event.target.value)
                }
              />
            </label>

            <label className="text-sm font-medium">
              Start date
              <input
                className={inputClass}
                type="date"
                value={values.startDate}
                onChange={(event) =>
                  changeValue("startDate", event.target.value)
                }
                required
              />
            </label>

            <label className="text-sm font-medium">
              End date
              <input
                className={inputClass}
                type="date"
                min={values.startDate || undefined}
                value={values.endDate}
                onChange={(event) => changeValue("endDate", event.target.value)}
                required
              />
            </label>
          </div>

          {errorMessage && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(false);
                setErrorMessage("");
              }}
              disabled={updateType.isPending}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={updateType.isPending}>
              {updateType.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xl font-semibold">{type.name}</p>

          <p className="mt-1 text-3xl font-bold">
            {type.currency === "INR" ? "₹" : `${type.currency} `}
            {Number(type.price).toLocaleString("en-IN")}
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            Category: {categoryName}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-[230px] rounded-xl bg-muted/50 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Registration window
            </p>

            <p className="mt-1 font-medium">
              {new Date(type.startDate).toLocaleDateString("en-GB")}
              {" – "}
              {new Date(type.endDate).toLocaleDateString("en-GB")}
            </p>
          </div>

          <div className="min-w-[150px] rounded-xl bg-muted/50 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Capacity
            </p>

            <p className="mt-1 font-medium">{type.capacity ?? "Unlimited"}</p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={startEditing}
          className="shrink-0"
        >
          Edit
        </Button>
      </div>
    </div>
  );
}
