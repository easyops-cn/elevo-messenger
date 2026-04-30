import { style, createVar } from "@vanilla-extract/css";
import { recipe, RecipeVariants } from "@vanilla-extract/recipes";
import { DefaultReset, Disabled, FocusOutline, RadiiVariant, toRem } from "folds";

const avatarSize = createVar();

export const Avatar = recipe({
  base: [
    DefaultReset,
    {
      userSelect: "none",

      display: "inline-flex",
      justifyContent: "center",
      alignItems: "center",
      flexShrink: 0,
      width: avatarSize,
      height: avatarSize,
      overflow: "hidden",
      position: "relative",
    },
    FocusOutline,
    Disabled,
  ],

  variants: {
    size: {
      "100": {
        vars: {
          [avatarSize]: toRem(18),
        },
      },
      "200": {
        vars: {
          [avatarSize]: toRem(24),
        },
      },
      "250": {
        vars: {
          [avatarSize]: toRem(28),
        },
      },
      "300": {
        vars: {
          [avatarSize]: toRem(32),
        },
      },
      "400": {
        vars: {
          [avatarSize]: toRem(42),
        },
      },
      "500": {
        vars: {
          [avatarSize]: toRem(58),
        },
      },
    },
    radii: RadiiVariant,
  },
  defaultVariants: {
    size: "400",
    radii: "400",
  },
});
export type AvatarVariants = RecipeVariants<typeof Avatar>;

export const AvatarImage = style([
  DefaultReset,
  {
    objectFit: "cover",
    width: "100%",
    height: "100%",
    borderRadius: "inherit",
    position: "absolute",
  },
]);

export const AvatarFallback = style([
  DefaultReset,
  {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
    borderRadius: "inherit",
    position: "absolute",
  },
]);
