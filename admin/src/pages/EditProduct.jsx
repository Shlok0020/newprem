import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProductForm from '../components/ProductForm';
import productService from '../services/productService';
import toast from 'react-hot-toast';

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [glassSubcategories, setGlassSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("📦 Fetching product with ID:", id);
      
      // ✅ FIXED: productService.getById returns the product data directly
      const productData = await productService.getById(id);
      console.log("✅ Product data received:", productData);
      
      // Check if product data exists
      if (!productData) {
        throw new Error("Product not found");
      }
      
      // Set categories
      const categoriesData = [
        { id: 'glass', label: 'Glass' },
        { id: 'plywood', label: 'Plywood' },
        { id: 'hardware', label: 'Hardware' },
        { id: 'interior', label: 'Interior' }
      ];
      
      // Set glass subcategories
      const glassSubcategoriesData = [
        { id: "window-glass", label: "Window Glass", description: "Clear glass for windows and doors" },
        { id: "mirror-glass", label: "Mirror Glass", description: "Premium mirrors for bathrooms" },
        { id: "flute-glass", label: "Flute Glass", description: "Textured glass with flute pattern" },
        { id: "plain-glass", label: "Plain Glass", description: "Standard clear glass" },
        { id: "laminated-glass", label: "Laminated Glass", description: "Safety glass with PVB interlayer" },
        { id: "toughened-glass", label: "Toughened Glass", description: "Heat-strengthened safety glass" },
        { id: "frosted-glass", label: "Frosted Glass", description: "Privacy glass with etched finish" }
      ];
      
      setProduct(productData);
      setCategories(categoriesData);
      setGlassSubcategories(glassSubcategoriesData);
      
    } catch (error) {
      console.error('❌ Error fetching product:', error);
      setError(error.message || 'Failed to load product');
      toast.error('Failed to load product details');
      
      // Redirect after 2 seconds if product not found
      setTimeout(() => {
        navigate('/products');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    const loadingToast = toast.loading("Updating product...");
    
    try {
      console.log("📤 Updating product ID:", id);
      console.log("📤 Update data:", formData);
      
      // ✅ FIXED: Pass id and formData to update method
      await productService.update(id, formData);
      
      toast.dismiss(loadingToast);
      toast.success('Product updated successfully');
      
      // Navigate back to products page with refresh flag
      navigate('/products', { state: { refresh: true, updated: true } });
      
      // Dispatch event to refresh product list
      window.dispatchEvent(new CustomEvent('productUpdated', { detail: { id } }));
      
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('❌ Error updating product:', error);
      // Error message is already shown by productService
    }
  };

  const handleCancel = () => {
    navigate('/products');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading product details...</p>
        <style>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 60vh;
            gap: 1rem;
          }

          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #c9a96e;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .loading-container p {
            color: #666;
            font-size: 1rem;
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h2>Error Loading Product</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/products')} className="error-button">
          Back to Products
        </button>
        <style>{`
          .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 60vh;
            text-align: center;
            padding: 2rem;
          }

          .error-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }

          .error-container h2 {
            color: #dc3545;
            margin-bottom: 1rem;
          }

          .error-container p {
            color: #666;
            margin-bottom: 2rem;
          }

          .error-button {
            padding: 0.75rem 1.5rem;
            background: #c9a96e;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
          }

          .error-button:hover {
            background: #b88a4a;
          }
        `}</style>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="no-product-container">
        <p>No product data available</p>
        <button onClick={() => navigate('/products')}>Back to Products</button>
        <style>{`
          .no-product-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 60vh;
            gap: 1rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="edit-product">
      <div className="page-header">
        <h1 className="page-title">Edit Product</h1>
        <div className="product-info">
          <span className="product-id-badge">ID: {product._id || product.id}</span>
          <span className="product-status">Editing Mode</span>
        </div>
      </div>
      
      <ProductForm 
        initialData={product}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        categories={categories}
        glassSubcategories={glassSubcategories}
      />

      <style>{`
        .edit-product {
          animation: fadeIn 0.5s ease;
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          background: #ffffff;
          min-height: 100vh;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .page-header {
          margin-bottom: 2rem;
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .page-title {
          font-size: 2rem;
          color: #111;
          font-family: 'Cormorant Garamond', serif;
          margin: 0;
          font-weight: 600;
        }

        .product-info {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .product-id-badge {
          background: #f5f5f5;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          color: #666;
          font-family: monospace;
        }

        .product-status {
          background: #c9a96e20;
          color: #c9a96e;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        /* Responsive Styles */
        @media (max-width: 768px) {
          .edit-product {
            padding: 1rem;
          }

          .page-title {
            font-size: 1.5rem;
          }

          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 480px) {
          .edit-product {
            padding: 0.75rem;
          }

          .page-title {
            font-size: 1.3rem;
          }

          .product-info {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
};

export default EditProduct;