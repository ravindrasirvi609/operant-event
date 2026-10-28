"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { AsyncBoundary } from "@/components/query/async-boundary";
import { RegistrationCategoryForm } from "@/components/registrations/registration-category-form";
import { RegistrationTypeForm } from "@/components/registrations/registration-type-form";
import { RegistrationTypeCard } from "@/components/registrations/registration-type-card";
import { useRegistrationCategories } from "@/hooks/use-registration-categories";

export function RegistrationCategoryList({
  conferenceId,
}: {
  conferenceId: string;
}) {
  const categoriesQuery = useRegistrationCategories(conferenceId);

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);

  const previousCategoryIds = useRef<string[] | null>(null);

  useEffect(() => {
    if (!categoriesQuery.isSuccess) {
      return;
    }

    const categories = categoriesQuery.data;
    const currentCategoryIds = categories.map((category) => category.id);

    if (previousCategoryIds.current === null) {
  previousCategoryIds.current = currentCategoryIds;
  return;
}

    if (currentCategoryIds.length > previousCategoryIds.current.length) {
      const newCategory = categories.find(
        (category) => !previousCategoryIds.current?.includes(category.id),
      );

      if (newCategory) {
        setShowCategoryForm(false);
        setOpenCategoryId(newCategory.id);
      }
    }

    previousCategoryIds.current = currentCategoryIds;
  }, [categoriesQuery.isSuccess, categoriesQuery.data]);

  return (
    <div className="w-full max-w-6xl space-y-6">
      <AsyncBoundary
        query={categoriesQuery}
        empty={
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No registration categories yet.
            </p>
          </div>
        }
      >
        {(categories) => {
          const pricingWindows = categories.flatMap((category) =>
            category.types.map((type) => ({
              ...type,
              categoryName: category.name,
            })),
          );

          const sortedPricingWindows = [...pricingWindows].reverse();

          return (
            <div className="space-y-6">
              {/* All pricing windows */}
              {sortedPricingWindows.length > 0 && (
                <div className="space-y-4">
                  {sortedPricingWindows.map((type) => (
                    <RegistrationTypeCard
                      key={type.id}
                      conferenceId={conferenceId}
                      categoryName={type.categoryName}
                      type={type}
                    />
                  ))}
                </div>
              )}

              {/* Add registration category */}
              <div className="rounded-2xl border bg-card shadow-sm">
                <div className="flex items-center justify-between gap-4 px-6 py-5">
                  <div>
                    <h2 className="text-xl font-semibold">
                      Add a registration category
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Create another registration category for this conference.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCategoryForm((current) => !current)}
                  >
                    {showCategoryForm ? "Close" : "Add category"}
                  </Button>
                </div>

                {showCategoryForm && (
                  <div className="border-t px-6 py-6">
                    <RegistrationCategoryForm conferenceId={conferenceId} />
                  </div>
                )}
              </div>

              {/* Categories */}
              <div className="space-y-6">
                {categories.map((category, index) => {
                  const isOpen =
  openCategoryId === category.id ||
  (openCategoryId === null &&
    categories.length === 1 &&
    index === 0);

                  return (
                    <div
                      key={category.id}
                      className="overflow-hidden rounded-2xl border bg-card shadow-sm"
                    >
                      {/* Category header */}
                      <div className="flex items-center justify-between gap-4 px-6 py-6">
                        <div>
                          <h2 className="text-3xl font-semibold">
                            {category.name}
                          </h2>

                          {category.description && (
                            <p className="mt-2 text-base text-muted-foreground">
                              {category.description}
                            </p>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setOpenCategoryId(isOpen ? null : category.id)
                          }
                        >
                          {isOpen ? "Close" : "Open"}
                        </Button>
                      </div>

                      {/* Add pricing window */}
                      {isOpen && (
                        <div className="border-t px-6 py-6">
                          <div className="rounded-2xl border bg-muted/10 p-6">
                            <div className="mb-6">
                              <h3 className="text-2xl font-semibold">
                                Add pricing window
                              </h3>

                              <p className="mt-1 text-sm text-muted-foreground">
                                Add a registration price, currency, capacity and
                                availability period.
                              </p>
                            </div>

                            <RegistrationTypeForm
                              conferenceId={conferenceId}
                              categoryId={category.id}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
