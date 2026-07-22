// ─── TaskCard.js (Mobile App — volunteer task list card) ─────────────────────
// FIX SUMMARY:
//  1. Read `task.donorLocation` as the primary field (matches Firestore schema).
//     Fall back to `task.pickupLocation` for any legacy documents that used the
//     old key, so existing tasks don't suddenly break.
//  2. Import and use `getDonorInitials()` from locationHelper so the avatar
//     circle shows real initials instead of hardcoded "??" when `donorName` is
//     present on the task document.
//  3. Import and use `formatScheduledDate()` so the date row shows a real value
//     instead of "No date set" now that `scheduledDate` is written by the hook.
//  4. The parent VolunteerTasksScreen passes `getGeneralArea(item.donorLocation)`
//     as a prop already — but we also compute it locally as a belt-and-suspenders
//     fallback so the card works even when rendered without that prop.
// ────────────────────────────────────────────────────────────────────────────

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { getGeneralArea, getDonorInitials, formatScheduledDate } from "../../utils/locationHelper";

// ── TaskCard ──────────────────────────────────────────────────────────────────

/**
 * @param {Object}   props
 * @param {Object}   props.task        - The pickup_tasks Firestore document data
 * @param {Function} props.onPress     - Called when the card is tapped
 * @param {string}   [props.areaLabel] - Pre-computed area string from parent
 *                                       (VolunteerTasksScreen passes this)
 */
export default function TaskCard({ task, onPress, areaLabel }) {
  // ── FIX 1: donorLocation with backward-compat fallback ────────────────────
  // Old tasks may have stored the address under `pickupLocation` (wrong key).
  // New tasks written by the fixed useFirestore.js use `donorLocation`.
  const location = task.donorLocation || task.pickupLocation || null;

  // ── Area string ───────────────────────────────────────────────────────────
  // Prefer the pre-computed prop from the parent list screen (avoids
  // recalculating on every render), but fall back to computing it locally.
  const area = areaLabel || getGeneralArea(location);

  // ── FIX 2: Donor initials using the helper ────────────────────────────────
  // `task.donorName` is now written by the fixed createOpenPickupTask().
  // getDonorInitials() gracefully returns "??" when the name is missing.
  const initials = getDonorInitials(task.donorName);

  // ── FIX 3: Scheduled date with preferredPickupDate fallback ─────────────────
  // If scheduledDate is null (not yet assigned), show the donor's preferred
  // pickup date instead. Falls back to 'Pickup date TBD' if neither is set.
  const dateLabel = task.scheduledDate
    ? formatScheduledDate(task.scheduledDate)
    : task.preferredPickupDate
    ? `📅 Preferred: ${task.preferredPickupDate}`
    : 'Pickup date TBD';

  // ── Drop-off location ──────────────────────────────────────────────────────
  const dropOffName = task.dropOffLocation?.name || task.collectionPointName || task.ngoName || null;

  // ── Status badge colour ───────────────────────────────────────────────────
  const statusColor = {
    open:        "#4CAF50",
    accepted:    "#2196F3",
    "in-transit": "#FF9800",
    completed:   "#9E9E9E",
  }[task.status] || "#9E9E9E";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* ── Avatar ──────────────────────────────────────────────────────── */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <View style={styles.content}>
        {/* Donor name row */}
        <Text style={styles.donorName} numberOfLines={1}>
          {task.donorName || "Unknown Donor"}
        </Text>

        {/* Category */}
        {task.category ? (
          <Text style={styles.category} numberOfLines={1}>
            {task.category}
          </Text>
        ) : null}

        {/* Pickup area */}
        <Text style={styles.area} numberOfLines={1}>
          📍 {area}
        </Text>

        {/* Drop-off destination */}
        {dropOffName ? (
          <Text style={styles.dropoff} numberOfLines={1}>
            🏢 → {dropOffName}
          </Text>
        ) : null}

        {/* Units */}
        {task.units != null ? (
          <Text style={styles.category} numberOfLines={1}>
            📦 Units: {task.units}
          </Text>
        ) : null}

        {/* Date */}
        <Text style={styles.date}>
          🗓 {dateLabel}
        </Text>

        {/* Pickup preference */}
        {task.pickupPreference ? (
          <Text style={styles.preference} numberOfLines={1}>
            ⏰ {task.pickupPreference}
          </Text>
        ) : null}
      </View>

      {/* ── Status badge ─────────────────────────────────────────────────── */}
      <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
        <Text style={styles.statusText}>
          {task.status ? task.status.toUpperCase() : "OPEN"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flexDirection:  "row",
    alignItems:     "center",
    backgroundColor: "#FFFFFF",
    borderRadius:   12,
    padding:        14,
    marginVertical:  6,
    marginHorizontal: 12,
    shadowColor:    "#000",
    shadowOffset:   { width: 0, height: 2 },
    shadowOpacity:  0.08,
    shadowRadius:   4,
    elevation:      3,
  },

  // ── Avatar ──────────────────────────────────────────────────────────────
  avatar: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: "#4F46E5",
    alignItems:      "center",
    justifyContent:  "center",
    marginRight:     12,
  },
  avatarText: {
    color:      "#FFFFFF",
    fontWeight: "700",
    fontSize:   16,
  },

  // ── Content ──────────────────────────────────────────────────────────────
  content: {
    flex: 1,
  },
  donorName: {
    fontWeight:  "600",
    fontSize:    15,
    color:       "#1F2937",
    marginBottom: 2,
  },
  category: {
    fontSize:    13,
    color:       "#6B7280",
    marginBottom: 2,
  },
  area: {
    fontSize:    13,
    color:       "#374151",
    marginBottom: 2,
  },
  date: {
    fontSize:    12,
    color:       "#9CA3AF",
    marginBottom: 2,
  },
  preference: {
    fontSize:    12,
    color:       "#6366F1",
  },
  dropoff: {
    fontSize:    12,
    color:       "#7C3AED",
    marginBottom: 2,
  },

  // ── Status badge ──────────────────────────────────────────────────────────
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:      8,
    marginLeft:        8,
    alignSelf:         "flex-start",
  },
  statusText: {
    color:      "#FFFFFF",
    fontWeight: "700",
    fontSize:   10,
  },
});
