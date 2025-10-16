import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import { type PropsWithChildren, type ReactElement } from 'react';

export type RenderWithRouterOptions = Omit<RenderOptions, 'wrapper'> & {
  initialEntries?: MemoryRouterProps['initialEntries'];
  initialIndex?: MemoryRouterProps['initialIndex'];
};

const createWrapper = ({ initialEntries, initialIndex }: RenderWithRouterOptions = {}) => {
  const Wrapper = ({ children }: PropsWithChildren) => (
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      {children}
    </MemoryRouter>
  );
  return Wrapper;
};

export const renderWithRouter = (ui: ReactElement, options?: RenderWithRouterOptions) => {
  const { initialEntries, initialIndex, ...renderOptions } = options ?? {};
  const wrapper = createWrapper({ initialEntries, initialIndex });
  return render(ui, { wrapper, ...renderOptions });
};
