'use client';
import { jsx } from 'react/jsx-runtime';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSyncExternalStore, useRef, useState, useEffect, use, createContext, useCallback, startTransition, useMemo } from 'react';

function useHash() {
    return useSyncExternalStore(subscribeHash, getHashSnapshot, getServerHashSnapshot);
}
function getHashSnapshot() {
    return window.location.hash;
}
function getServerHashSnapshot() {
    return '';
}
function subscribeHash(onStoreChange) {
    window.addEventListener('hashchange', onStoreChange);
    return ()=>window.removeEventListener('hashchange', onStoreChange);
}

// TODO: This implementation might not be complete when there are nested
// Suspense boundaries during a route transition. But it should work fine for
// the most common use cases.
function useBrowserNativeTransitions() {
    const pathname = usePathname();
    const currentPathname = useRef(pathname);
    // This is a global state to keep track of the view transition state.
    const [currentViewTransition, setCurrentViewTransition] = useState(null);
    useEffect(()=>{
        if (!('startViewTransition' in document)) {
            return ()=>{};
        }
        const onPopState = ()=>{
        // let pendingViewTransitionResolve: () => void
        //
        // const pendingViewTransition = new Promise<void>((resolve) => {
        //   pendingViewTransitionResolve = resolve
        // })
        //
        // const pendingStartViewTransition = new Promise<void>((resolve) => {
        //   // @ts-ignore
        //   document.startViewTransition(() => {
        //     resolve()
        //     return pendingViewTransition
        //   })
        // })
        //
        // setCurrentViewTransition([
        //   pendingStartViewTransition,
        //   pendingViewTransitionResolve!,
        // ])
        };
        window.addEventListener('popstate', onPopState);
        return ()=>{
            window.removeEventListener('popstate', onPopState);
        };
    }, []);
    if (currentViewTransition && currentPathname.current !== pathname) {
        // Whenever the pathname changes, we block the rendering of the new route
        // until the view transition is started (i.e. DOM screenshotted).
        use(currentViewTransition[0]);
    }
    // Keep the transition reference up-to-date.
    const transitionRef = useRef(currentViewTransition);
    useEffect(()=>{
        transitionRef.current = currentViewTransition;
    }, [
        currentViewTransition
    ]);
    const hash = useHash();
    useEffect(()=>{
        // When the new route component is actually mounted, we finish the view
        // transition.
        currentPathname.current = pathname;
        if (transitionRef.current) {
            transitionRef.current[1]();
            transitionRef.current = null;
        }
    }, [
        hash,
        pathname
    ]);
}

const ViewTransitionsContext = /*#__PURE__*/ createContext(()=>()=>{});
function ViewTransitions({ children }) {
    const [finishViewTransition, setFinishViewTransition] = useState(null);
    useEffect(()=>{
        if (finishViewTransition) {
            finishViewTransition();
            setFinishViewTransition(null);
        }
    }, [
        finishViewTransition
    ]);
    useBrowserNativeTransitions();
    return /*#__PURE__*/ jsx(ViewTransitionsContext.Provider, {
        value: setFinishViewTransition,
        children: children
    });
}
function useSetFinishViewTransition() {
    return use(ViewTransitionsContext);
}

function _extends$1() {
    _extends$1 = Object.assign || function(target) {
        for(var i = 1; i < arguments.length; i++){
            var source = arguments[i];
            for(var key in source){
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    target[key] = source[key];
                }
            }
        }
        return target;
    };
    return _extends$1.apply(this, arguments);
}
function _object_without_properties_loose(source, excluded) {
    if (source == null) return {};
    var target = {};
    var sourceKeys = Object.keys(source);
    var key, i;
    for(i = 0; i < sourceKeys.length; i++){
        key = sourceKeys[i];
        if (excluded.indexOf(key) >= 0) continue;
        target[key] = source[key];
    }
    return target;
}
function useTransitionRouter() {
    const router = useRouter();
    const finishViewTransition = useSetFinishViewTransition();
    const triggerTransition = useCallback((cb, { onTransitionReady } = {})=>{
        if ('startViewTransition' in document) {
            // @ts-ignore
            const transition = document.startViewTransition(()=>new Promise((resolve)=>{
                    startTransition(()=>{
                        cb();
                        finishViewTransition(()=>resolve);
                    });
                }));
            if (onTransitionReady) {
                transition.ready.then(onTransitionReady);
            }
        } else {
            return cb();
        }
    }, []);
    const push = useCallback((href, _param = {})=>{
        var { onTransitionReady } = _param, options = _object_without_properties_loose(_param, [
            "onTransitionReady"
        ]);
        triggerTransition(()=>router.push(href, options), {
            onTransitionReady
        });
    }, [
        triggerTransition,
        router
    ]);
    const replace = useCallback((href, _param = {})=>{
        var { onTransitionReady } = _param, options = _object_without_properties_loose(_param, [
            "onTransitionReady"
        ]);
        triggerTransition(()=>router.replace(href, options), {
            onTransitionReady
        });
    }, [
        triggerTransition,
        router
    ]);
    return useMemo(()=>_extends$1({}, router, {
            push,
            replace
        }), [
        push,
        replace,
        router
    ]);
}

function _extends() {
    _extends = Object.assign || function(target) {
        for(var i = 1; i < arguments.length; i++){
            var source = arguments[i];
            for(var key in source){
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    target[key] = source[key];
                }
            }
        }
        return target;
    };
    return _extends.apply(this, arguments);
}
// copied from https://github.com/vercel/next.js/blob/66f8ffaa7a834f6591a12517618dce1fd69784f6/packages/next/src/client/link.tsx#L180-L191
function isModifiedEvent(event) {
    const eventTarget = event.currentTarget;
    const target = eventTarget.getAttribute('target');
    return target && target !== '_self' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || // triggers resource download
    event.nativeEvent && event.nativeEvent.which === 2;
}
// copied from https://github.com/vercel/next.js/blob/66f8ffaa7a834f6591a12517618dce1fd69784f6/packages/next/src/client/link.tsx#L204-L217
function shouldPreserveDefault(e) {
    const { nodeName } = e.currentTarget;
    // anchors inside an svg have a lowercase nodeName
    const isAnchorNodeName = nodeName.toUpperCase() === 'A';
    if (isAnchorNodeName && isModifiedEvent(e)) {
        // ignore click for browser’s default behavior
        return true;
    }
    return false;
}
// This is a wrapper around next/link that explicitly uses the router APIs
// to navigate, and trigger a view transition.
function Link(props) {
    const router = useTransitionRouter();
    const { href, as, replace, scroll } = props;
    const onClick = useCallback((e)=>{
        if (props.onClick) {
            props.onClick(e);
        }
        if ('startViewTransition' in document) {
            if (shouldPreserveDefault(e)) {
                return;
            }
            e.preventDefault();
            const navigate = replace ? router.replace : router.push;
            navigate(as || href, {
                scroll: scroll != null ? scroll : true
            });
        }
    }, [
        props.onClick,
        href,
        as,
        replace,
        scroll
    ]);
    return /*#__PURE__*/ jsx(NextLink, _extends({}, props, {
        onClick: onClick
    }));
}

export { Link, ViewTransitions, useTransitionRouter };
