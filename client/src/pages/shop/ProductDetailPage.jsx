import { useParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';

export default function ProductDetailPage() {
  const { slug } = useParams();
  return <PageHeader title="Product" subtitle={slug} />;
}
