<!-- Discrete values via v-model: {align,shape,fill}. Radio names are unique per component instance. -->


<template>
  <section aria-label="Choices and toggles">
    <h2>Choices &amp; toggles</h2>
    <p>One choice, a mode, and an independent boolean.</p>
    <fieldset>
      <legend>Alignment</legend>
      <div class="segmented">
        <label v-for="alignment in ['left', 'center', 'right']" :key="alignment"
          ><input
            type="radio"
            :name="group"
            :value="alignment"
            :checked="model.align === alignment"
            @change="model = { ...model, align: alignment }"
          /><span><Icon name="check" class="selection-check" />{{
            alignment[0].toUpperCase() + alignment.slice(1)
          }}</span></label
        >
      </div>
    </fieldset>
    <div class="pair">
      <label
        >Shape<select
          :value="model.shape"
          @change="model = { ...model, shape: $event.target.value }"
        >
          <option value="circle">Circle</option>
          <option value="square">Square</option>
        </select></label
      ><label class="inline"
        ><input
          type="checkbox"
          :checked="model.fill"
          @change="model = { ...model, fill: $event.target.checked }"
        />Fill shape</label
      >
    </div>
  </section>
</template>

<script setup>
import { useId } from "vue";
import Icon from "./Icon.vue";
const model = defineModel({ type: Object, required: true }),
  group = useId();
</script>
