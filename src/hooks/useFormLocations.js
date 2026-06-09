import { useState, useEffect, useCallback } from "react";
import { loadFormLocations, getFormLocationHelpers } from "../utils/formLocations";

/**
 * Loads a form's active locations (online -> backend + cache, offline -> cache)
 * and forces a re-render once they are ready. Returns the form-scoped location
 * helpers plus loading state.
 *
 *   const { loading, getStateOptions, getDistrictOptions, getBlockOptions,
 *           getVillageOptions } = useFormLocations('BI_ANNUAL');
 */
export default function useFormLocations(formKey) {
  // `version` is bumped after a (re)load so consuming components re-render and
  // the helpers (which read the live module cache) return fresh options.
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    return loadFormLocations(formKey)
      .then(() => setVersion((v) => v + 1))
      .finally(() => setLoading(false));
  }, [formKey]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadFormLocations(formKey)
      .then(() => active && setVersion((v) => v + 1))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [formKey]);

  return { loading, version, reload, ...getFormLocationHelpers(formKey) };
}
