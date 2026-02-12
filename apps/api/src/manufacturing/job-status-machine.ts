import { Injectable, BadRequestException } from '@nestjs/common';
import { JobStatus, UserRole } from '@b2b/prisma-schema';

interface TransitionRequirement {
  requiredFields?: string[];
  allowedRoles?: UserRole[];
}

/**
 * State machine for JobItem status transitions.
 *
 * Valid transitions:
 *   NEW → PRINTING → QUALITY_CHECK → PACKED → DISPATCHED
 *                                   → QC_FAILED → PRINTING (re-print)
 *
 * Conditional requirements:
 *   → PACKED: requires qcPhotoUrl
 *   → DISPATCHED: requires trackingNumber + shippingCarrier
 */
@Injectable()
export class JobStatusMachine {
  private readonly validTransitions: Record<JobStatus, JobStatus[]> = {
    NEW: [JobStatus.PRINTING],
    PRINTING: [JobStatus.QUALITY_CHECK],
    QUALITY_CHECK: [JobStatus.PACKED, JobStatus.QC_FAILED],
    QC_FAILED: [JobStatus.PRINTING],
    PACKED: [JobStatus.DISPATCHED],
    DISPATCHED: [], // Terminal state
  };

  private readonly transitionRequirements: Record<string, TransitionRequirement> = {
    [`${JobStatus.NEW}->${JobStatus.PRINTING}`]: {
      allowedRoles: [UserRole.FACTORY_MANAGER, UserRole.ADMIN],
    },
    [`${JobStatus.QUALITY_CHECK}->${JobStatus.PACKED}`]: {
      requiredFields: ['qcPhotoUrl'],
      allowedRoles: [UserRole.QC_INSPECTOR, UserRole.ADMIN],
    },
    [`${JobStatus.QUALITY_CHECK}->${JobStatus.QC_FAILED}`]: {
      allowedRoles: [UserRole.QC_INSPECTOR, UserRole.ADMIN],
    },
    [`${JobStatus.PACKED}->${JobStatus.DISPATCHED}`]: {
      requiredFields: ['trackingNumber', 'shippingCarrier'],
      allowedRoles: [UserRole.PACKER, UserRole.FACTORY_MANAGER, UserRole.ADMIN],
    },
  };

  validateTransition(
    currentStatus: JobStatus,
    newStatus: JobStatus,
    data: Record<string, any>,
    userRole: UserRole,
  ): void {
    // Check if transition is valid
    const allowedNext = this.validTransitions[currentStatus];
    if (!allowedNext || !allowedNext.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid transition: ${currentStatus} → ${newStatus}. ` +
          `Allowed: ${allowedNext?.join(', ') || 'none'}`,
      );
    }

    // Check transition-specific requirements
    const reqKey = `${currentStatus}->${newStatus}`;
    const requirements = this.transitionRequirements[reqKey];

    if (requirements) {
      // Check role
      if (requirements.allowedRoles && !requirements.allowedRoles.includes(userRole)) {
        throw new BadRequestException(
          `Role ${userRole} is not allowed for transition ${currentStatus} → ${newStatus}`,
        );
      }

      // Check required fields
      if (requirements.requiredFields) {
        for (const field of requirements.requiredFields) {
          if (!data[field]) {
            throw new BadRequestException(
              `Field "${field}" is required for transition ${currentStatus} → ${newStatus}`,
            );
          }
        }
      }
    }
  }

  getValidNextStatuses(currentStatus: JobStatus): JobStatus[] {
    return this.validTransitions[currentStatus] || [];
  }
}
