interface PageHeaderProps {
  title: string;
  description: string;
}

export function PageHeader({ title, description }: PageHeaderProps): React.JSX.Element {
  return (
    <header className="mb-8">
      <h2 className="text-2xl font-medium tracking-tight md:text-3xl">{title}</h2>
      <p className="text-muted-foreground mt-1 text-sm md:text-[15px]">{description}</p>
    </header>
  );
}
