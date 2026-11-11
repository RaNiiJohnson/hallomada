interface MutationWorkflowOptions<T> {
  mutation: () => Promise<T>;
  onSuccess: (result: T) => void;
  onError: (error: unknown) => void;
}

/**
 * Keep success side effects strictly behind an acknowledged server mutation.
 * Returns whether the mutation completed so callers can decide whether to
 * close dialogs or navigate.
 */
export async function runMutationWorkflow<T>({
  mutation,
  onSuccess,
  onError,
}: MutationWorkflowOptions<T>): Promise<boolean> {
  try {
    const result = await mutation();
    onSuccess(result);
    return true;
  } catch (error) {
    onError(error);
    return false;
  }
}
