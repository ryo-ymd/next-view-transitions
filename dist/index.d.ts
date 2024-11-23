import * as react_jsx_runtime from 'react/jsx-runtime';
import NextLink from 'next/link';
import { AppRouterInstance, NavigateOptions } from 'next/dist/shared/lib/app-router-context.shared-runtime';

declare function Link(props: React.ComponentProps<typeof NextLink>): react_jsx_runtime.JSX.Element;

declare function ViewTransitions({ children, }: Readonly<{
    children: React.ReactNode;
}>): react_jsx_runtime.JSX.Element;

type TransitionOptions = {
    onTransitionReady?: () => void;
};
type NavigateOptionsWithTransition = NavigateOptions & TransitionOptions;
type TransitionRouter = AppRouterInstance & {
    push: (href: string, options?: NavigateOptionsWithTransition) => void;
    replace: (href: string, options?: NavigateOptionsWithTransition) => void;
};
declare function useTransitionRouter(): TransitionRouter;

export { Link, ViewTransitions, useTransitionRouter };
