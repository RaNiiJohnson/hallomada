// 'use client';

// import { FormEvent, useState } from "react";
// import { fetchPostJSON } from "@/lib/api-helpers";
// import getStripe from "@/lib/get-stripe";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { toast } from "sonner";
// import { useRouter } from "next/navigation";
// import { CreditCard, TrendingUp, DollarSign, Loader2 } from "lucide-react";
// import { motion } from "motion/react";

// const CURRENCY = 'euro';
// const MIN_AMOUNT = 1.0;
// const MAX_AMOUNT = 5000.0;
// const STRIPE_FEE_PERCENTAGE = 0.029; // 2.9%
// const STRIPE_FEE_FIXED = 0.30; // $0.30

// export default function CheckoutForm() {
//     const { replace } = useRouter()
//     const [loading, setLoading] = useState(false);
//     const [input, setInput] = useState({
//         customDonation: Math.round(MAX_AMOUNT / 10),
//     });

//     // Calculate total amount needed so that after Stripe takes their fee,
//     // the net amount received is exactly what the user specified
//     // Formula: Total = (DesiredAmount + FixedFee) / (1 - PercentageFee)
//     const calculateTotalWithFees = (desiredAmount: number) => {
//         return (desiredAmount + STRIPE_FEE_FIXED) / (1 - STRIPE_FEE_PERCENTAGE);
//     };

//     const totalAmount = calculateTotalWithFees(input.customDonation);
//     const stripeFee = totalAmount - input.customDonation;

//     const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
//         setInput({
//             ...input,
//             [e.currentTarget.name]: parseFloat(e.currentTarget.value),
//         });
//     };

//     const handleSubmit = async (e: FormEvent) => {
//         e.preventDefault();
//         setLoading(true);

//         // Validate amount
//         if (input.customDonation < MIN_AMOUNT || input.customDonation > MAX_AMOUNT) {
//             alert(`Veuillez entrer une somme entre €${MIN_AMOUNT} et €${MAX_AMOUNT}`);
//             setLoading(false);
//             return;
//         }

//         try {
//             // Create a Checkout Session with total amount (including fees) in cents
//             const checkoutSession: any = await fetchPostJSON(
//                 '/api/checkout_sessions',
//                 { amount: Math.round(totalAmount * 100) },
//             );

//             if (checkoutSession.statusCode === 500) {
//                 toast.error(checkoutSession.message);

//                 setLoading(false);
//                 return;
//             }

//             // Redirect to Checkout using Stripe
//             const stripe = await getStripe();
//             if (!stripe) {
//                 toast.error('Impossible de charger Stripe. Veuillez réessayer plus tard.');
//                 setLoading(false);
//                 return;
//             }

//             setLoading(false);

//             window.location.href = checkoutSession.url

//         } catch (error) {
//             toast.error('Error', {
//                 description:
//                     String(error)
//             });
//             console.error('Erreur', error)
//             setLoading(false);
//         }
//     };

//     return (
//         <form onSubmit={handleSubmit} className="space-y-6">
//             <motion.div
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 className="space-y-2"
//             >
//                 <Label htmlFor="customDonation" className="flex items-center gap-2">
//                     <DollarSign className="w-4 h-4 text-muted-foreground" />
//                     Montant à envoyer ({CURRENCY.toUpperCase()})
//                 </Label>
//                 <div className="relative">
//                     <Input
//                         id="customDonation"
//                         name="customDonation"
//                         type="number"
//                         placeholder="Enter amount"
//                         step="0.01"
//                         min={MIN_AMOUNT}
//                         max={MAX_AMOUNT}
//                         value={input.customDonation}
//                         onChange={handleInputChange}
//                         required
//                         className="text-lg font-semibold"
//                     />
//                     {input.customDonation > 0 && (
//                         <motion.div
//                             initial={{ scale: 0 }}
//                             animate={{ scale: 1 }}
//                             className="absolute right-3 top-1/2 -translate-y-1/2"
//                         >
//                             <TrendingUp className="w-4 h-4 text-green-600" />
//                         </motion.div>
//                     )}
//                 </div>
//                 <p className="text-xs text-muted-foreground">
//                     Min: €{MIN_AMOUNT} - Max: €{MAX_AMOUNT}
//                 </p>
//             </motion.div>

//             {/* Stripe Fee Breakdown */}
//             {input.customDonation > 0 && !isNaN(input.customDonation) && (
//                 <motion.div
//                     initial={{ opacity: 0, height: 0 }}
//                     animate={{ opacity: 1, height: "auto" }}
//                     exit={{ opacity: 0, height: 0 }}
//                     className="rounded-lg border bg-linear-to-br from-muted/50 to-muted/30 p-5 space-y-3 text-sm overflow-hidden"
//                 >
//                     <div className="flex items-center gap-2 mb-3">
//                         <CreditCard className="w-4 h-4 text-primary" />
//                         <h3 className="font-semibold text-sm">Détails du paiement</h3>
//                     </div>

//                     <motion.div
//                         initial={{ opacity: 0, x: -20 }}
//                         animate={{ opacity: 1, x: 0 }}
//                         transition={{ delay: 0.1 }}
//                         className="flex justify-between items-center p-2 rounded bg-background/50"
//                     >
//                         <span className="text-muted-foreground">Somme reçue:</span>
//                         <span className="font-medium">€{input.customDonation.toFixed(2)}</span>
//                     </motion.div>

//                     <motion.div
//                         initial={{ opacity: 0, x: -20 }}
//                         animate={{ opacity: 1, x: 0 }}
//                         transition={{ delay: 0.2 }}
//                         className="flex justify-between items-center p-2 rounded bg-background/50"
//                     >
//                         <span className="text-muted-foreground">
//                             Frais de traitement Stripe:
//                         </span>
//                         <span className="font-medium text-amber-600">€{stripeFee.toFixed(2)}</span>
//                     </motion.div>

//                     <motion.div
//                         initial={{ opacity: 0, x: -20 }}
//                         animate={{ opacity: 1, x: 0 }}
//                         transition={{ delay: 0.3 }}
//                         className="border-t pt-3 flex justify-between font-semibold text-base"
//                     >
//                         <span>Montant total à payer:</span>
//                         <span className="text-primary">€{totalAmount.toFixed(2)}</span>
//                     </motion.div>

//                     <motion.p
//                         initial={{ opacity: 0 }}
//                         animate={{ opacity: 1 }}
//                         transition={{ delay: 0.4 }}
//                         className="text-xs text-muted-foreground mt-2 italic bg-primary/5 p-2 rounded"
//                     >
//                         ℹ️ Calculé pour que vous receviez exactement €{input.customDonation.toFixed(2)} après les frais de Stripe de 2,9 % + 0,30 $
//                     </motion.p>
//                 </motion.div>
//             )}

//             <motion.div
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ delay: 0.2 }}
//             >
//                 <Button
//                     type="submit"
//                     disabled={loading}
//                     className="w-full relative overflow-hidden group"
//                     size="lg"
//                 >
//                     {loading ? (
//                         <span className="flex items-center gap-2">
//                             <Loader2 className="w-4 h-4 animate-spin" />
//                             Traitement...
//                         </span>
//                     ) : (
//                         <>
//                             <span className="flex items-center gap-2">
//                                 <CreditCard className="w-4 h-4" />
//                                 Payer €{totalAmount.toFixed(2)}
//                             </span>
//                             <motion.div
//                                 className="absolute inset-0 bg-white/20"
//                                 initial={{ x: "-100%" }}
//                                 whileHover={{ x: "100%" }}
//                                 transition={{ duration: 0.5 }}
//                             />
//                         </>
//                     )}
//                 </Button>
//             </motion.div>
//         </form>
//     );
// }
