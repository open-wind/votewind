import * as React from "react";
import clsx from "clsx";

const buttonBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

const variantClasses = {
  default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
  destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
  outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizeClasses = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-8",
  icon: "h-9 w-9",
};

const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? React.Fragment : "button";

    if (asChild) {
      return React.cloneElement(React.Children.only(children), {
        className: clsx(
          buttonBase,
          variantClasses[variant],
          sizeClasses[size],
          children.props.className,
          className
        ),
        ref,
        ...props
      });
    }

    return (
      <button
        className={clsx(
          buttonBase,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
