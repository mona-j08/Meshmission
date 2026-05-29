import React, { useState } from 'react';
import { useCollection, firestoreService } from '../hooks/useFirestore';
import CapacityBar from '../components/Common/CapacityBar';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ConfirmationModal from '../components/Modals/ConfirmationModal';
import { CATEGORY_LIST } from '../constants/categories';

export default function CollectionPoints() {
  const { data: points, loading } = useCollection('collection_points');
  
  // Modals & form state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formMaxCap, setFormMaxCap] = useState(100);
  const [formCurCap, setFormCurCap] = useState(0);
  const [formAcceptedTypes, setFormAcceptedTypes] = useState([]);
  const [formIsActive, setFormIsActive] = useState(true);

  // Danger delete state
  const [deletePointId, setDeletePointId] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  if (loading) {
    return <LoadingSpinner message="Retrieving warehouse schemas and mapping distribution nodes..." />;
  }

  const handleOpenCreate = () => {
    setSelectedPoint(null);
    setFormName('');
    setFormAddress('');
    setFormMaxCap(100);
    setFormCurCap(0);
    setFormAcceptedTypes([CATEGORY_LIST[0], CATEGORY_LIST[1]]);
    setFormIsActive(true);
    setIsEditOpen(true);
  };

  const handleOpenEdit = (pt) => {
    setSelectedPoint(pt);
    setFormName(pt.name || '');
    setFormAddress(pt.address || '');
    setFormMaxCap(pt.maxCapacity || 100);
    setFormCurCap(pt.currentCapacity || 0);
    setFormAcceptedTypes(pt.acceptedCategories || pt.acceptedTypes || []);
    setFormIsActive(pt.isActive !== false);
    setIsEditOpen(true);
  };

  const handleCheckboxChange = (cat) => {
    if (formAcceptedTypes.includes(cat)) {
      setFormAcceptedTypes(formAcceptedTypes.filter((c) => c !== cat));
    } else {
      setFormAcceptedTypes([...formAcceptedTypes, cat]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName || !formAddress || formAcceptedTypes.length === 0) {
      alert('Please fill out all required fields and select at least one accepted type.');
      return;
    }

    setLoadingSubmit(true);
    try {
      const payload = {
        name: formName,
        address: formAddress,
        maxCapacity: Number(formMaxCap),
        currentCapacity: Number(formCurCap),
        acceptedCategories: formAcceptedTypes,
        isActive: formIsActive,
      };

      if (selectedPoint) {
        await firestoreService.updateCollectionPoint(selectedPoint.id, payload);
      } else {
        await firestoreService.createCollectionPoint(payload);
      }
      setIsEditOpen(false);
    } catch (err) {
      console.error('Failed to submit collection point form:', err);
      alert('Failed to save collection point.');
    }
    setLoadingSubmit(false);
  };

  const handleOpenDelete = (ptId) => {
    setDeletePointId(ptId);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletePointId) return;
    try {
      await firestoreService.deleteCollectionPoint(deletePointId);
      setIsDeleteOpen(false);
      setDeletePointId(null);
    } catch (err) {
      console.error('Failed to delete node:', err);
      alert('Error deleting collection point.');
    }
  };

  return (
    <div className="collection-points-page">
      {/* Upper Control Bar */}
      <div className="control-bar-header">
        <span className="subtitle">Configure regional drop-off centers and inventory warehouses</span>
        <button className="btn-primary" onClick={handleOpenCreate}>
          ➕ Add Collection Point
        </button>
      </div>

      {/* Main Node Grid/Table */}
      <div className="table-card-panel">
        {points.length > 0 ? (
          <div className="table-responsive-wrapper">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Warehouse Point</th>
                  <th>Accepted Categories</th>
                  <th>Capacity Loading</th>
                  <th>Node Status</th>
                  <th className="actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {points.map((pt) => (
                  <tr key={pt.id} className="table-row-hoverable">
                    <td>
                      <div className="node-title-cell">
                        <strong>{pt.name}</strong>
                        <span className="node-address">{pt.address}</span>
                      </div>
                    </td>
                    <td>
                      <div className="accepted-types-list">
                        {(pt.acceptedCategories || pt.acceptedTypes || []).map((cat, idx) => (
                          <span className="type-pill-label" key={idx}>{cat}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <CapacityBar current={pt.currentCapacity} max={pt.maxCapacity} />
                    </td>
                    <td>
                      <span className={`status-pill ${pt.isActive !== false ? 'active' : 'suspended'}`}>
                        {pt.isActive !== false ? 'Operational' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="action-cell">
                      <button 
                        className="btn-primary btn-sm btn-outline margin-right-sm"
                        onClick={() => handleOpenEdit(pt)}
                      >
                        ⚙️ Edit
                      </button>
                      <button 
                        className="btn-danger btn-sm"
                        onClick={() => handleOpenDelete(pt.id)}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-empty-state">
            <span className="empty-icon">📦</span>
            <h4>No warehouses configured</h4>
            <p>Click "Add Collection Point" to set up your first inventory warehouse drop-off node.</p>
          </div>
        )}
      </div>

      {/* Edit/Create Modal Overlay */}
      {isEditOpen && (
        <div className="modal-backdrop-overlay">
          <div className="modal-content-container point-form-modal">
            <div className="modal-header">
              <h3>{selectedPoint ? 'Modify Collection Point' : 'Create Collection Point'}</h3>
              <button className="modal-close-btn" onClick={() => setIsEditOpen(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body scrollable-body">
                <div className="form-group">
                  <label htmlFor="pt-name">Warehouse/Point Name *</label>
                  <input
                    type="text"
                    id="pt-name"
                    className="form-input-control"
                    placeholder="e.g. Indiranagar Community Hub"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="pt-address">Physical Street Address *</label>
                  <input
                    type="text"
                    id="pt-address"
                    className="form-input-control"
                    placeholder="e.g. 562, 8th Main Rd, Bangalore"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="pt-max">Max Item Capacity *</label>
                    <input
                      type="number"
                      id="pt-max"
                      className="form-input-control"
                      value={formMaxCap}
                      onChange={(e) => setFormMaxCap(e.target.value)}
                      min="1"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pt-curr">Current Stock Count</label>
                    <input
                      type="number"
                      id="pt-curr"
                      className="form-input-control"
                      value={formCurCap}
                      onChange={(e) => setFormCurCap(e.target.value)}
                      min="0"
                      max={formMaxCap}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Accepted Donation Categories * (Select at least one)</label>
                  <div className="checkbox-pills-selector">
                    {CATEGORY_LIST.map((cat) => {
                      const isSelected = formAcceptedTypes.includes(cat);
                      return (
                        <button
                          type="button"
                          key={cat}
                          className={`pill-checkbox-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleCheckboxChange(cat)}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {cat.toUpperCase().replace('_', ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group inline-toggle-group">
                  <label htmlFor="pt-active">Active Operational Status</label>
                  <input
                    type="checkbox"
                    id="pt-active"
                    className="toggle-switch-checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                  />
                  <span>Node is active and accepting donor drop-offs</span>
                </div>
              </div>
              
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsEditOpen(false)}
                  disabled={loadingSubmit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loadingSubmit}
                >
                  {loadingSubmit ? 'Saving Warehouse Config...' : 'Save Collection Point'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Danger Confirmation Modal */}
      {isDeleteOpen && (
        <ConfirmationModal
          isOpen={isDeleteOpen}
          title="Delete Collection Point?"
          message="WARNING: Deleting this collection point is permanent. Associated donors using this point for offline drops may be affected."
          confirmText="Yes, Delete Node"
          isDanger={true}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setIsDeleteOpen(false);
            setDeletePointId(null);
          }}
        />
      )}
    </div>
  );
}
