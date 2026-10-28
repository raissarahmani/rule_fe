import { UnderlyResponse, UnderlyHistoryResponse } from "../api/underly";

export type StandardStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "-";

export function getUnderlyStatus(
  item: UnderlyResponse | UnderlyHistoryResponse
): StandardStatus {
  if ("ActionType" in item) {
    switch (item.ActionType) {
      case "SUBMITTED":
        return "PENDING";
      case "APPROVED":
        return "APPROVED";
      case "REJECTED":
        return "REJECTED";
      case "CANCELLED":
        return "CANCELLED";
      default:
        return "-";
    }
  }

  switch (item.doc_status) {
    case "Pending":
    case "PENDING":
      return "PENDING";
    case "APPROVED":
      return "APPROVED";
    case "REJECTED":
      return "REJECTED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "-";
  }
}
