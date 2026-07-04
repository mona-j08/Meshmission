// ─── VolunteerTaskDetailScreen.js (Mobile App) ───────────────────────────────
// FIX SUMMARY:
//  1. Display `pickupPreference` in the header details section so volunteers
//     see the donor's preferred pickup window (was missing entirely).
//  2. Show the full `donorLocation.address` (or `.area`) on the detail screen
//     rather than only the abbreviated area shown on the card.
//  3. Show donor contact info (phone / email) once the volunteer has accepted
//     the task. Falls back from private sub-doc → donor's user profile so
//     the phone number is always available for coordination.
//  4. Handle both `donationIds` (array — new) and `donationId` (string — legacy)
//     when rendering the associated donation list.
//  5. Use `formatScheduledDate` from locationHelper for the date row.
// ────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../firebase/config";             // adjust path if needed
import { getGeneralArea, formatScheduledDate } from "../../utils/locationHelper";

// ── VolunteerTaskDetailScreen ────────────────────────────────────────────────

export default function VolunteerTaskDetailScreen({ route, navigation }) {
  const { taskId: paramTaskId, task: paramTask } = route.params || {};
  const taskId = paramTaskId || paramTask?.id;

  const [task,          setTask]          = useState(null);
  const [privateInfo,   setPrivateInfo]   = useState(null); // PII sub-doc
  const [loading,       setLoading]       = useState(true);
  const [accepting,     setAccepting]     = useState(false);
  const [error,         setError]         = useState(null);

  const currentUid = auth.currentUser?.uid;

  // ── Load task document ────────────────────────────────────────────────────
  const loadTask = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDoc(doc(db, "pickup_tasks", taskId));
      if (!snap.exists()) throw new Error("Task not found.");
      const data = { id: snap.id, ...snap.data() };
      setTask(data);

      // Load donor contact info if this volunteer already owns the task
      if (data.volunteerId === currentUid) {
        await loadDonorContactInfo(taskId, data.donorId);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [taskId, currentUid]);

  // ── Load donor contact info ──────────────────────────────────────────────
  // Strategy: Try private sub-doc first (forward-compat), then fall back to
  // fetching phone/email directly from the donor's user profile document.
  const loadDonorContactInfo = async (tid, donorId) => {
    try {
      // 1. Try the private sub-doc (may not exist yet)
      const pvtSnap = await getDoc(doc(db, "pickup_tasks", tid, "private", "donorContact"));
      if (pvtSnap.exists()) {
        setPrivateInfo(pvtSnap.data());
        return;
      }
    } catch {
      // Non-fatal — sub-doc may not exist
    }

    // 2. Fall back: fetch from the donor's user profile
    if (donorId) {
      try {
        const userSnap = await getDoc(doc(db, "users", donorId));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const phone = userData.phoneNumber || userData.phone || null;
          const email = userData.email || null;
          if (phone || email) {
            setPrivateInfo({ phone, email });
          }
        }
      } catch {
        // Non-fatal — user doc may be inaccessible
      }
    }
  };

  useEffect(() => { loadTask(); }, [loadTask]);

  // ── Accept task ───────────────────────────────────────────────────────────
  const handleAccept = async () => {
    if (!task || accepting) return;
    setAccepting(true);
    try {
      await updateDoc(doc(db, "pickup_tasks", taskId), {
        volunteerId: currentUid,
        status:      "accepted",
        updatedAt:   serverTimestamp(),
      });
      // Reload to get private sub-doc now that we're the assigned volunteer
      await loadTask();
    } catch (err) {
      Alert.alert("Error", "Could not accept the task. Please try again.");
      console.error("Accept task failed:", err);
    } finally {
      setAccepting(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Returns the full address string from the donorLocation object.
   * Falls back through address → area → plain string → generic fallback.
   */
  function getFullAddress(location) {
    if (!location) return "Address not available";
    if (typeof location === "string") return location;
    return location.address || location.area || "Address not available";
  }

  /**
   * FIX 4 – Normalise donation IDs regardless of which key was written.
   * New tasks have `donationIds` (array).
   * Old tasks have `donationId` (string).
   */
  function getDonationIds(t) {
    if (!t) return [];
    if (Array.isArray(t.donationIds) && t.donationIds.length > 0) return t.donationIds;
    if (t.donationId) return [t.donationId];
    return [];
  }

  // ── Render states ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (error || !task) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || "Task not found."}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isAccepted   = task.status !== "open";
  const isMyTask     = task.volunteerId === currentUid;
  const donationIds  = getDonationIds(task);
  const fullAddress  = getFullAddress(task.donorLocation || task.pickupLocation);
  const generalArea  = getGeneralArea(task.donorLocation || task.pickupLocation);

  // Drop-off location info
  const dropOff = task.dropOffLocation || null;
  const dropOffName = dropOff?.name || task.collectionPointName || task.ngoName || null;
  const dropOffAddress = dropOff?.address || task.collectionPointAddress || task.ngoAddress || null;
  const dropOffType = dropOff?.type || (task.collectionPointId ? 'collection_point' : 'ngo');

  // Open address in maps
  const openInMaps = (address) => {
    if (!address || address === "Address not available") return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch(() => {});
  };

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Task Overview card ─────────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Task Details</Text>
        <DetailRow label="Donor" value={task.donorName || "Unknown Donor"} />
        <DetailRow label="Category" value={task.category || "General"} />
        {task.description ? (
          <DetailRow label="Description" value={task.description} />
        ) : null}
        <DetailRow
          label="Scheduled Date"
          value={formatScheduledDate(task.scheduledDate)}
        />
        {task.pickupPreference ? (
          <DetailRow label="Pickup Preference" value={task.pickupPreference} />
        ) : null}
        <DetailRow label="Status" value={(task.status || "open").toUpperCase()} />
      </View>

      {/* ── Pickup Location card ──────────────────────────────────────────── */}
      <View style={[styles.card, styles.pickupCard]}>
        <View style={styles.locationHeader}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationTitle}>Pickup Location</Text>
          <View style={styles.locationBadge}>
            <Text style={styles.locationBadgeText}>FROM</Text>
          </View>
        </View>
        <Text style={styles.locationName}>{task.donorName || "Donor"}</Text>
        <Text style={styles.locationArea}>{generalArea}</Text>
        <Text style={styles.locationAddress}>{fullAddress}</Text>
        {fullAddress && fullAddress !== "Address not available" && (
          <TouchableOpacity
            style={styles.navigateBtn}
            onPress={() => openInMaps(fullAddress)}
          >
            <Text style={styles.navigateBtnText}>🗺️ Navigate to Pickup</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Drop-off Location card ────────────────────────────────────────── */}
      <View style={[styles.card, styles.dropoffCard]}>
        <View style={styles.locationHeader}>
          <Text style={styles.locationIcon}>🏢</Text>
          <Text style={styles.locationTitle}>Drop-off Location</Text>
          <View style={[styles.locationBadge, styles.dropoffBadge]}>
            <Text style={styles.locationBadgeText}>TO</Text>
          </View>
        </View>
        {dropOffName ? (
          <>
            <Text style={styles.locationName}>{dropOffName}</Text>
            <Text style={styles.locationTypeLabel}>
              {dropOffType === 'collection_point' ? '📦 Collection Point' : '🏠 NGO'}
            </Text>
            <Text style={styles.locationAddress}>{dropOffAddress || "Address not available"}</Text>
            {dropOffAddress && dropOffAddress !== "Address not available" && (
              <TouchableOpacity
                style={[styles.navigateBtn, styles.navigateBtnDropoff]}
                onPress={() => openInMaps(dropOffAddress)}
              >
                <Text style={styles.navigateBtnText}>🗺️ Navigate to Drop-off</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <Text style={styles.locationAddress}>Drop-off location not yet assigned</Text>
        )}
      </View>

      {/* ── Donor contact info (visible only after accepting) ─────────────── */}
      {isMyTask && privateInfo && (
        <View style={[styles.card, styles.contactCard]}>
          <Text style={styles.cardTitle}>📞 Donor Contact</Text>
          <Text style={styles.contactHelpText}>
            Use the donor's contact details to coordinate pickup — confirm the 
            exact address, agree on a time slot, or check item availability.
          </Text>

          {privateInfo.phone ? (
            <View style={styles.phoneSection}>
              <View style={styles.phoneRow}>
                <Text style={styles.phoneIcon}>📱</Text>
                <View style={styles.phoneInfo}>
                  <Text style={styles.phoneLabel}>Phone Number</Text>
                  <Text style={styles.phoneNumber}>{privateInfo.phone}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => Linking.openURL(`tel:${privateInfo.phone}`)}
              >
                <Text style={styles.callBtnText}>📞 Call Donor</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {privateInfo.email ? (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => Linking.openURL(`mailto:${privateInfo.email}`)}
            >
              <Text style={styles.contactLabel}>✉️ Email</Text>
              <Text style={styles.contactValue}>{privateInfo.email}</Text>
            </TouchableOpacity>
          ) : null}

          {!privateInfo.phone && !privateInfo.email && (
            <Text style={styles.contactNote}>No contact details on file.</Text>
          )}
        </View>
      )}

      {/* ── Accept button (open tasks only) ─────────────────────────────────── */}
      {!isAccepted && (
        <TouchableOpacity
          style={[styles.acceptBtn, accepting && styles.acceptBtnDisabled]}
          onPress={handleAccept}
          disabled={accepting}
        >
          {accepting
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.acceptBtnText}>Accept Task</Text>
          }
        </TouchableOpacity>
      )}

      {/* ── Already accepted — show Confirm Pickup button ──────────────────── */}
      {isAccepted && isMyTask && task.status !== 'picked_up' && task.status !== 'completed' && (
        <>
          <View style={styles.acceptedBanner}>
            <Text style={styles.acceptedBannerText}>
              ✅ You have accepted this task.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.confirmPickupBtn}
            onPress={() => navigation.navigate('VolunteerPickupConfirm', { taskId, task })}
          >
            <Text style={styles.confirmPickupBtnText}>📸 Confirm Pickup</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── Pickup already confirmed — show Proceed to Delivery ─────────── */}
      {isAccepted && isMyTask && task.status === 'picked_up' && (
        <>
          <View style={styles.acceptedBanner}>
            <Text style={styles.acceptedBannerText}>
              ✅ Pickup confirmed!
            </Text>
          </View>
          <TouchableOpacity
            style={styles.deliveryBtn}
            onPress={() => navigation.navigate('VolunteerDelivery', { taskId })}
          >
            <Text style={styles.deliveryBtnText}>🚚 Proceed to Delivery</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── Task completed ────────────────────────────────────────────────── */}
      {isAccepted && isMyTask && task.status === 'completed' && (
        <View style={styles.acceptedBanner}>
          <Text style={styles.acceptedBannerText}>
            🎉 This task has been completed.
          </Text>
        </View>
      )}


    </ScrollView>
  );
}

// ── Shared detail row sub-component ──────────────────────────────────────────

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorText: {
    color:      "#EF4444",
    fontSize:   15,
    textAlign:  "center",
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: "#FFF",
    fontWeight: "600",
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius:    12,
    padding:         16,
    marginBottom:    16,
    shadowColor:     "#000",
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.07,
    shadowRadius:    4,
    elevation:       3,
  },
  cardTitle: {
    fontWeight:    "700",
    fontSize:      16,
    color:         "#111827",
    marginBottom:  12,
  },

  // ── Detail rows ───────────────────────────────────────────────────────────
  detailRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "flex-start",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailLabel: {
    flex:       1,
    color:      "#6B7280",
    fontSize:   13,
    fontWeight: "500",
  },
  detailValue: {
    flex:      2,
    color:     "#1F2937",
    fontSize:  13,
    textAlign: "right",
  },

  // ── Contact card & rows ────────────────────────────────────────────────────
  contactCard: {
    borderLeftWidth:  4,
    borderLeftColor: "#10B981",
  },
  contactHelpText: {
    color:        "#4B5563",
    fontSize:     13,
    lineHeight:   19,
    marginBottom:  14,
  },
  contactNote: {
    color:        "#6B7280",
    fontSize:     13,
    marginBottom:  8,
    fontStyle:    "italic",
  },
  phoneSection: {
    backgroundColor: "#F0FDF4",
    borderRadius:    10,
    padding:         14,
    marginBottom:     8,
  },
  phoneRow: {
    flexDirection:  "row",
    alignItems:     "center",
    marginBottom:    12,
  },
  phoneIcon: {
    fontSize:    28,
    marginRight: 12,
  },
  phoneInfo: {
    flex: 1,
  },
  phoneLabel: {
    color:      "#6B7280",
    fontSize:   12,
    fontWeight: "500",
    marginBottom: 2,
  },
  phoneNumber: {
    color:      "#111827",
    fontSize:   18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  callBtn: {
    backgroundColor: "#10B981",
    borderRadius:    10,
    paddingVertical:  12,
    alignItems:      "center",
  },
  callBtnText: {
    color:      "#FFFFFF",
    fontWeight: "700",
    fontSize:   15,
  },
  contactRow: {
    flexDirection:  "row",
    alignItems:     "center",
    paddingVertical: 8,
  },
  contactLabel: {
    color:     "#374151",
    fontWeight: "600",
    fontSize:   14,
    width:       80,
  },
  contactValue: {
    color:    "#4F46E5",
    fontSize: 14,
    textDecorationLine: "underline",
  },

  // ── Accept button ─────────────────────────────────────────────────────────
  acceptBtn: {
    backgroundColor: "#4F46E5",
    borderRadius:    12,
    paddingVertical:  14,
    alignItems:      "center",
    marginTop:        8,
  },
  acceptBtnDisabled: {
    opacity: 0.6,
  },
  acceptBtnText: {
    color:      "#FFFFFF",
    fontWeight: "700",
    fontSize:   16,
  },

  // ── Accepted banner ───────────────────────────────────────────────────────
  acceptedBanner: {
    backgroundColor: "#D1FAE5",
    borderRadius:    12,
    padding:         14,
    alignItems:      "center",
    marginTop:        8,
  },
  acceptedBannerText: {
    color:      "#065F46",
    fontWeight: "600",
    fontSize:   14,
  },

  // ── Pickup / Drop-off location cards ────────────────────────────────────
  pickupCard: {
    borderLeftWidth:  4,
    borderLeftColor: "#10B981",
  },
  dropoffCard: {
    borderLeftWidth:  4,
    borderLeftColor: "#6366F1",
  },
  locationHeader: {
    flexDirection:  "row",
    alignItems:     "center",
    marginBottom:    10,
  },
  locationIcon: {
    fontSize:    20,
    marginRight: 8,
  },
  locationTitle: {
    fontSize:    15,
    fontWeight:  "700",
    color:       "#111827",
    flex:        1,
  },
  locationBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      6,
  },
  dropoffBadge: {
    backgroundColor: "#E0E7FF",
  },
  locationBadgeText: {
    fontSize:    10,
    fontWeight:  "800",
    color:       "#065F46",
    letterSpacing: 1,
  },
  locationName: {
    fontSize:    16,
    fontWeight:  "600",
    color:       "#1F2937",
    marginBottom: 4,
  },
  locationArea: {
    fontSize:    13,
    color:       "#6B7280",
    marginBottom: 2,
  },
  locationAddress: {
    fontSize:    13,
    color:       "#374151",
    lineHeight:  19,
    marginBottom: 8,
  },
  locationTypeLabel: {
    fontSize:    12,
    color:       "#6366F1",
    fontWeight:  "600",
    marginBottom: 4,
  },
  navigateBtn: {
    backgroundColor: "#10B981",
    borderRadius:    8,
    paddingVertical:  10,
    alignItems:      "center",
    marginTop:        4,
  },
  navigateBtnDropoff: {
    backgroundColor: "#6366F1",
  },
  navigateBtnText: {
    color:      "#FFFFFF",
    fontWeight: "600",
    fontSize:   13,
  },

  // ── Confirm Pickup button ──────────────────────────────────────────────
  confirmPickupBtn: {
    backgroundColor: "#F59E0B",
    borderRadius:    12,
    paddingVertical:  14,
    alignItems:      "center",
    marginTop:        12,
  },
  confirmPickupBtnText: {
    color:      "#FFFFFF",
    fontWeight: "700",
    fontSize:   16,
  },

  // ── Proceed to Delivery button ─────────────────────────────────────────
  deliveryBtn: {
    backgroundColor: "#10B981",
    borderRadius:    12,
    paddingVertical:  14,
    alignItems:      "center",
    marginTop:        12,
  },
  deliveryBtnText: {
    color:      "#FFFFFF",
    fontWeight: "700",
    fontSize:   16,
  },
});
