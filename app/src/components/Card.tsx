import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "../lib/utils";

/**
 * Card component props
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * Card component - container with border and padding
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

/**
 * CardHeader component props
 */
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * CardHeader component - header section of card
 */
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

/**
 * CardTitle component props
 */
export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

/**
 * CardTitle component - title heading for card
 */
export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

/**
 * CardDescription component props
 */
export interface CardDescriptionProps
  extends HTMLAttributes<HTMLParagraphElement> {}

/**
 * CardDescription component - description text for card
 */
export const CardDescription = forwardRef<
  HTMLParagraphElement,
  CardDescriptionProps
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-gray-600 dark:text-gray-400", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

/**
 * CardContent component props
 */
export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * CardContent component - main content area of card
 */
export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

/**
 * CardFooter component props
 */
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * CardFooter component - footer section of card
 */
export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";
