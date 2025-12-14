import { supabase } from "../../lib/supabaseClient";

export const useDataStore = () => {
  return {
    query: async (table: string, options?: any) => {
      const { data, error } = await supabase.from(table).select(options?.select || "*");
      if (error) throw error;
      return data;
    },
    insert: async (table: string, values: any) => {
      const { data, error } = await supabase.from(table).insert(values).select();
      if (error) throw error;
      return data;
    },
    update: async (table: string, id: string, values: any) => {
      const { data, error } = await supabase.from(table).update(values).eq("id", id).select();
      if (error) throw error;
      return data;
    },
    delete: async (table: string, id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    }
  };
};
