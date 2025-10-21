import React from 'react';
import { vi } from 'vitest';

// Mock implementation of react-router-dom to avoid TextEncoder issues
export const MemoryRouter = ({ children }: any) => <div>{children}</div>;
export const BrowserRouter = ({ children }: any) => <div>{children}</div>;
export const Routes = ({ children }: any) => <div>{children}</div>;
export const Route = ({ children }: any) => <div>{children}</div>;
export const Link = ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>;
export const NavLink = ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>;
export const Outlet = () => <div />;

export const useNavigate = vi.fn(() => vi.fn());
export const useLocation = vi.fn(() => ({ pathname: '/', search: '', hash: '', state: null }));
export const useParams = vi.fn(() => ({}));
export const useSearchParams = vi.fn(() => [new URLSearchParams(), vi.fn()]);
export const useMatch = vi.fn(() => null);
export const useMatches = vi.fn(() => []);
export const useLoaderData = vi.fn(() => null);
export const useActionData = vi.fn(() => null);
export const useRouteError = vi.fn(() => null);
export const useNavigation = vi.fn(() => ({ state: 'idle', location: undefined, formMethod: undefined, formAction: undefined, formEncType: undefined, formData: undefined }));
export const useRevalidator = vi.fn(() => ({ revalidate: vi.fn(), state: 'idle' }));
export const useRouteLoaderData = vi.fn(() => null);
export const useBeforeUnload = vi.fn();

export default {
  MemoryRouter,
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  Outlet,
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
  useMatch,
  useMatches,
  useLoaderData,
  useActionData,
  useRouteError,
  useNavigation,
  useRevalidator,
  useRouteLoaderData,
  useBeforeUnload,
};