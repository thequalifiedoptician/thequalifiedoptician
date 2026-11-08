export type ProductSpecification = {
  label: string;
  value: string | null;
};

type ProductSpecificationsProps = {
  specifications: ProductSpecification[];
};

export default function ProductSpecifications({ specifications }: ProductSpecificationsProps) {
  const visibleSpecifications = specifications.filter(
    (specification): specification is ProductSpecification & { value: string } =>
      specification.value !== null && specification.value.trim().length > 0,
  );

  if (visibleSpecifications.length === 0) {
    return null;
  }

  return (
    <table className="product-specifications">
      <tbody>
        {visibleSpecifications.map(({ label, value }) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
